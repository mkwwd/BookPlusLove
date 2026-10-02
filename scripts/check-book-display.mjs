import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

import ts from 'typescript';

const { outputText } = ts.transpileModule(fs.readFileSync('src/lib/bookCopy.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
});
const exports = {};
vm.runInNewContext(outputText, { exports });
const { extractYear, buildCallNumber } = exports;
for (const [value, expected] of [[null, null], ['', null], ['unknown', null], ['2023-10-03', '2023'], ['published 1999', '1999']]) {
  assert.equal(extractYear(value), expected);
}
for (const [category, author, expected] of [[null, null, ''], ['', '', ''], ['000', null, '000'], [null, 'A12', 'A12'], ['830', 'A12', '830 A12']]) {
  assert.equal(buildCallNumber(category, author), expected);
}
console.log('Book year and call number formatting: 10 checks passed.');
