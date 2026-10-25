import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const exports = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/noticeBoard.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, { exports, URLSearchParams });
assert.equal(exports.noticePage('2'), 2);
for (const value of ['-1', '0', '1.5', 'abc', 'Infinity']) assert.equal(exports.noticePage(value), 1);
assert.equal(exports.noticePageCount(51), 6);
assert.equal(exports.noticePageCount(0), 1);
assert.equal(exports.noticeSearchPattern('100%_'), '%100\\%\\_%');
assert.equal(exports.noticeListUrl(2, 'title', '서울'), '/notices?page=2&field=title&q=%EC%84%9C%EC%9A%B8');
console.log('Notice board pagination and search checks passed');
