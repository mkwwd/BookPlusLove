import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const { PGlite } = await import(pathToFileURL(process.argv[2]).href);
const db = new PGlite();
try {
  await db.exec(
    'CREATE TABLE book_category_groups (code text PRIMARY KEY, label text NOT NULL);',
  );
  const palette = [
    '#FFEA5E',
    '#FA6728',
    '#D6D5D4',
    '#14A9FF',
    '#0089D9',
    '#78D44A',
    '#FFB0B9',
    '#FFCA45',
    '#157300',
    '#B88F53',
  ];
  for (let i = 0; i < palette.length; i++)
    await db.query('INSERT INTO book_category_groups VALUES ($1, $2)', [
      `${i}00`,
      `Group ${i}`,
    ]);
  const sql = fs.readFileSync('sql/book-category-group-colors.sql', 'utf8');
  await db.exec(sql);
  const { rows } = await db.query(
    'SELECT color FROM book_category_groups ORDER BY code',
  );
  assert.deepEqual(
    rows.map((row) => row.color),
    palette,
  );
  await db.exec(
    "UPDATE book_category_groups SET color = '#123456' WHERE code = '000'",
  );
  await db.exec(sql);
  assert.equal(
    (
      await db.query(
        "SELECT color FROM book_category_groups WHERE code = '000'",
      )
    ).rows[0].color,
    '#123456',
  );
  await db.exec(
    "INSERT INTO book_category_groups (code, label) VALUES ('999', 'Legacy client')",
  );
  assert.equal(
    (
      await db.query(
        "SELECT color FROM book_category_groups WHERE code = '999'",
      )
    ).rows[0].color,
    '#D6D5D4',
  );
  await assert.rejects(
    db.exec("UPDATE book_category_groups SET color = 'red' WHERE code = '000'"),
    /check constraint/,
  );
  await assert.rejects(
    db.exec("UPDATE book_category_groups SET color = NULL WHERE code = '000'"),
    /not-null constraint/,
  );
  assert.equal(
    (await db.query('SELECT count(*)::int AS count FROM book_category_groups'))
      .rows[0].count,
    11,
  );
  console.log(
    'Category color migration passed: palette, rerun preservation, old-client defaults, constraints. No remote database accessed.',
  );
} finally {
  await db.close();
}
