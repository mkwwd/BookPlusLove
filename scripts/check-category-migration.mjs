import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

// Pass a temporary PGlite installation; never connect this check to Supabase.
const modulePath = process.argv[2];
if (!modulePath)
  throw new Error('Pass the path to @electric-sql/pglite/dist/index.js');
const { PGlite } = await import(pathToFileURL(modulePath).href);
const expand = fs.readFileSync('sql/book-category-groups.sql', 'utf8');
const cleanupPath = 'sql/book-category-groups-cleanup.sql';

async function fixture(t) {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    grant usage on schema public to anon, authenticated, service_role;
    create table public.book_categories (
      code text primary key, label text not null,
      main_code text not null, main_label text not null
    );
    create table public.books (
      id integer primary key,
      category_code text references public.book_categories(code)
    );
    insert into public.book_categories values
      ('010', 'First', '000', 'Original'), ('020', 'Second', '000', 'Original');
    insert into public.books values (1, '010');
    grant select on public.book_categories to anon, authenticated;
    grant select, insert, update, delete on public.book_categories to service_role;
  `);
  return db;
}

test('expansion preserves legacy reads and synchronizes new writes, renames and moves', async (t) => {
  const db = await fixture(t);
  await db.exec(expand);
  assert.equal(
    (await db.query('select main_label from public.book_categories limit 1'))
      .rows[0].main_label,
    'Original',
  );
  await db.exec(`set role service_role;
    insert into public.book_categories(code, label, main_code) values ('030', 'New child', '000');
    update public.book_category_groups set label = 'Renamed' where code = '000';
    insert into public.book_category_groups values ('100', 'Destination');
    update public.book_categories set main_code = '100' where code = '010';
    update public.book_categories set label = 'Old client edit', main_label = 'Stale' where code = '020';
    reset role;
  `);
  assert.deepEqual(
    (
      await db.query(
        'select code, main_label from public.book_categories order by code',
      )
    ).rows,
    [
      { code: '010', main_label: 'Destination' },
      { code: '020', main_label: 'Renamed' },
      { code: '030', main_label: 'Renamed' },
    ],
  );
  assert.equal(
    (await db.query('select category_code from public.books')).rows[0]
      .category_code,
    '010',
  );
  await db.exec(expand);
  assert.equal(
    (
      await db.query(
        'select count(*)::int as count from public.book_category_groups',
      )
    ).rows[0].count,
    2,
  );
});

test('unknown parents and referenced parent removal stay protected', async (t) => {
  const db = await fixture(t);
  await db.exec(expand);
  for (const sql of [
    "insert into public.book_categories(code, label, main_code) values ('030', 'Bad', '999')",
    "update public.book_categories set main_code = '999' where code = '010'",
    "delete from public.book_category_groups where code = '000'",
    "update public.book_category_groups set code = '100' where code = '000'",
  ])
    await assert.rejects(db.exec(sql), (error) =>
      ['23503', '23001'].includes(error.code),
    );
});

test('client roles can read the new relation but cannot change groups', async (t) => {
  const db = await fixture(t);
  await db.exec(expand);
  for (const role of ['anon', 'authenticated']) {
    await db.exec(`set role ${role}`);
    assert.equal(
      (await db.query('select label from public.book_category_groups')).rows[0]
        .label,
      'Original',
    );
    await assert.rejects(
      db.exec("update public.book_category_groups set label = 'Unauthorized'"),
      (error) => error.code === '42501',
    );
    await db.exec('reset role');
  }
});

test('both tables acquire the same transaction lock before modifying rows', async (t) => {
  const db = await fixture(t);
  await db.exec(expand);
  const triggers = await db.query(`
    select c.relname, t.tgtype::int as type from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    where t.tgname = 'category_compat_write_lock' order by c.relname
  `);
  assert.deepEqual(triggers.rows, [
    { relname: 'book_categories', type: 30 },
    { relname: 'book_category_groups', type: 30 },
  ]);
  for (const sql of [
    "update public.book_categories set label = 'Changed' where code = '010'",
    "update public.book_category_groups set label = 'Renamed' where code = '000'",
  ]) {
    await db.exec(`begin; ${sql};`);
    const locks = await db.query(
      "select classid::int as namespace, objid::int as key from pg_locks where locktype = 'advisory' and granted",
    );
    assert.deepEqual(locks.rows, [{ namespace: 20261026, key: 1 }]);
    await db.exec('rollback');
  }
});

test('conflicting existing labels abort expansion without partial changes', async (t) => {
  const db = await fixture(t);
  await db.exec(
    "update public.book_categories set main_label = 'Conflict' where code = '020'",
  );
  await assert.rejects(db.exec(expand), /conflicting labels/);
  await db.exec('rollback');
  assert.equal(
    (
      await db.query(
        "select to_regclass('public.book_category_groups') as name",
      )
    ).rows[0].name,
    null,
  );
  assert.equal(
    (
      await db.query(
        "select main_label from public.book_categories where code = '020'",
      )
    ).rows[0].main_label,
    'Conflict',
  );
});

test('cleanup requires explicit confirmation and leaves new writes operational', async (t) => {
  const db = await fixture(t);
  await db.exec(expand);
  const cleanup = fs.readFileSync(cleanupPath, 'utf8');
  await assert.rejects(db.exec(cleanup), /Confirm/);
  await db.exec('rollback');
  await db.query('select main_label from public.book_categories');
  await db.exec(
    cleanup.replace(
      "app.category_cleanup_confirmed = 'no'",
      "app.category_cleanup_confirmed = 'yes'",
    ),
  );
  await assert.rejects(
    db.query('select main_label from public.book_categories'),
    (error) => error.code === '42703',
  );
  await db.exec(
    "insert into public.book_categories(code, label, main_code) values ('030', 'After cleanup', '000')",
  );
  assert.equal(
    (await db.query('select category_code from public.books')).rows[0]
      .category_code,
    '010',
  );
  await assert.rejects(db.exec(expand), /main_label/);
  await db.exec('rollback');
});
