import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

import { dateCases } from './check-publication-dates.mjs';

const modulePath = process.argv[2];
if (!modulePath)
  throw new Error(
    'Pass the temporary PGlite module path; never use production',
  );
const { PGlite } = await import(pathToFileURL(modulePath).href);

test('SQL preview changes nothing; apply normalizes only valid dates and is repeatable', async (t) => {
  const file = 'sql/normalize-publication-dates.sql';
  assert.ok(
    fs.existsSync(file),
    'Preview-first publication date migration must exist',
  );
  const preview = fs.readFileSync(file, 'utf8');
  const apply = preview.replace(
    "app.publication_dates_apply = 'no'",
    "app.publication_dates_apply = 'yes'",
  );
  assert.notEqual(preview, apply);
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(
    'create table public.books (id integer primary key, title text, pub_date text, marker text); create table public.book_copies(book_id integer references public.books(id));',
  );
  const cases = dateCases.filter(
    ([input]) => input == null || typeof input === 'string',
  );
  for (const [index, [input]] of cases.entries()) {
    await db.query('insert into public.books values ($1, $2, $3, $4)', [
      index + 1,
      'Book',
      input ?? null,
      'untouched',
    ]);
    await db.query('insert into public.book_copies values ($1)', [index + 1]);
  }
  const before = (await db.query('select * from public.books order by id'))
    .rows;
  await db.exec(preview);
  assert.deepEqual(
    (await db.query('select * from public.books order by id')).rows,
    before,
  );
  await db.exec(apply);
  const after = (await db.query('select * from public.books order by id')).rows;
  for (const [index, row] of after.entries()) {
    const [input, expected] = cases[index];
    assert.equal(row.pub_date, expected ?? input ?? null, String(input));
    assert.equal(row.marker, 'untouched');
  }
  assert.equal(
    (await db.query('select count(*)::int as n from public.book_copies'))
      .rows[0].n,
    cases.length,
  );
  await db.exec(apply);
  assert.deepEqual(
    (await db.query('select * from public.books order by id')).rows,
    after,
  );
});
