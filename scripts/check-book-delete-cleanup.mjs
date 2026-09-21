import assert from 'node:assert/strict';
import fs from 'node:fs';

const route = fs.readFileSync(
  'src/app/api/admin/books/[copyId]/route.ts',
  'utf8',
);

assert.match(
  route,
  /select\('book_id'\)/,
  'delete route reads the parent book id before deleting a copy',
);
assert.match(
  route,
  /select\('id', \{ count: 'exact', head: true \}\)/,
  'delete route counts remaining copies after deleting one copy',
);
assert.match(
  route,
  /remainingCopies === 0/,
  'delete route detects when no copies remain',
);
assert.match(
  route,
  /\.from\('books'\)\s*\.delete\(\)/,
  'delete route removes the parent book when its last copy is deleted',
);
