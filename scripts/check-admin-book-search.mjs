import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

import ts from 'typescript';

const path = 'src/app/(page)/admin/books/page.tsx';
const source = fs.readFileSync(path, 'utf8');
const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true);
const page = ast.statements.find(
  (node) => ts.isFunctionDeclaration(node) && node.name?.text === 'AdminBooksPage',
);
const statements = page.body.statements.filter(
  (node) =>
    ts.isVariableStatement(node) &&
    node.declarationList.declarations.some((declaration) =>
      ['trimmedSearch', 'visibleBooks'].includes(declaration.name.getText(ast)),
    ),
);
assert.equal(statements.length, 2);
const filterCode = statements.map((node) => node.getText(ast)).join('\n');
const books = [
  { regNo: 'MB005557', title: 'First book', author: 'Alice' },
  { regNo: 'MB001690', title: 'Second book', author: null },
];
function search(searchText) {
  return Array.from(
    vm.runInNewContext(`${filterCode}\nvisibleBooks.map(book => book.regNo)`, {
      books,
      searchText,
    }),
  );
}

test('registration numbers support full, partial and case-insensitive search', () => {
  for (const query of ['MB005557', 'mb005557', ' Mb005557 ', '005557', '5557']) {
    assert.deepEqual(search(query), ['MB005557'], query);
  }
  assert.deepEqual(search('MB999999'), []);
});

test('title, author, empty queries and nullable authors retain existing behavior', () => {
  assert.deepEqual(search('First'), ['MB005557']);
  assert.deepEqual(search(' Alice '), ['MB005557']);
  assert.deepEqual(search('Second'), ['MB001690']);
  assert.deepEqual(search('   '), ['MB005557', 'MB001690']);
  assert.deepEqual(search('missing'), []);
});
