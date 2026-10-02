import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

import ts from 'typescript';

function loadDrafts(entries, response) {
  let mutation;
  let stateIndex = 0;
  let current = entries;
  const revoked = [];
  const source = fs.readFileSync('src/app/(page)/admin/books/new/page.tsx', 'utf8');
  const dependencies = {
    react: {
      useState(initial) {
        const index = stateIndex++;
        return [index === 2 ? current : initial, (value) => {
          if (index === 2) current = typeof value === 'function' ? value(current) : value;
        }];
      },
    },
    '@tanstack/react-query': {
      useQuery: () => ({ data: [] }),
      useMutation: (options) => { mutation = options; return {}; },
    },
    'next/navigation': { useSearchParams: () => ({ get: () => null }) },
    '@/lib/regNo': { isValidRegNo: () => true },
    'react/jsx-runtime': { jsx: () => null, jsxs: () => null },
  };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(`${source}\nexport { BookRegisterContent };`, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, {
    exports,
    require: (name) => dependencies[name] ?? {},
    URL: { revokeObjectURL: (url) => revoked.push(url) },
    FormData: class { append() {} },
    fetch: async (url) => url.endsWith('/cover')
      ? { ok: true, json: async () => ({ url: 'https://storage/uploaded.jpg' }) }
      : response,
  });
  exports.BookRegisterContent();
  return { mutation, revoked, current: () => current };
}

const books = [
  { id: '1', title: 'A', regNo: 'MB000001', coverUrl: 'blob:a', coverFile: {} },
  { id: '2', title: 'B', regNo: 'MB000002', coverUrl: 'blob:b', coverFile: {} },
];

test('partial registration keeps original failed draft file and preview for retry', async () => {
  const draft = loadDrafts(books, { ok: true, json: async () => ({
    registered: 1, failed: [{ regNo: 'MB000002', error: 'duplicate' }], coverWarnings: ['cleanup failed'],
  }) });
  const result = await draft.mutation.mutationFn(books);
  assert.deepEqual(draft.revoked, []);
  draft.mutation.onSuccess(result, books);
  assert.equal(draft.current().length, 1);
  assert.equal(draft.current()[0], books[1]);
  assert.deepEqual(draft.revoked, ['blob:a']);
  assert.equal(result.coverWarnings[0], 'cleanup failed');
});

test('failed request keeps files and previews while displaying cleanup warning', async () => {
  const draft = loadDrafts(books, { ok: false, json: async () => ({ error: 'save failed', coverWarnings: ['cleanup failed'] }) });
  await assert.rejects(draft.mutation.mutationFn(books), /save failed\ncleanup failed/);
  assert.equal(draft.current(), books);
  assert.deepEqual(draft.revoked, []);
});
