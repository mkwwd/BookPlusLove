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
  const calls = [];
  let tableProps;
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
    'react/jsx-runtime': {
      jsx(type, props) {
        if (type?.name === 'ScannedBookTable') tableProps = props;
        return null;
      },
      jsxs: () => null,
    },
  };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(`${source}\nexport { BookRegisterContent };`, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, {
    exports,
    require: (name) => dependencies[name] ?? {},
    URL: { revokeObjectURL: (url) => revoked.push(url) },
    FormData: class { append() {} },
    fetch: async (url, options) => {
      calls.push({ url, options });
      return url.endsWith('/cover')
      ? { ok: true, json: async () => ({ url: 'https://storage/uploaded.jpg' }) }
      : response;
    },
  });
  exports.BookRegisterContent();
  return { mutation, revoked, calls, tableProps, current: () => current };
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

test('choosing an API cover after a file clears the pending upload and releases the preview', async () => {
  const draft = loadDrafts(books, { ok: true, json: async () => ({ registered: 1, failed: [] }) });
  draft.tableProps.onUpdate('1', { coverUrl: 'https://api.example/cover.jpg' });
  assert.equal(draft.current()[0].coverFile, undefined);
  assert.deepEqual(draft.revoked, ['blob:a']);
  await draft.mutation.mutationFn([draft.current()[0]]);
  assert.equal(draft.calls.length, 1);
  assert.equal(draft.calls[0].url, '/api/admin/books');
  assert.equal(JSON.parse(draft.calls[0].options.body).books[0].coverUrl, 'https://api.example/cover.jpg');
});

test('replacing a file keeps the new file; unrelated edits keep the selected cover', () => {
  const draft = loadDrafts(books, {});
  const file = { name: 'new.jpg' };
  draft.tableProps.onUpdate('1', { coverUrl: 'blob:new', coverFile: file });
  draft.tableProps.onUpdate('1', { title: 'Edited' });
  assert.equal(draft.current()[0].coverFile, file);
  assert.equal(draft.current()[0].coverUrl, 'blob:new');
  assert.deepEqual(draft.revoked, ['blob:a']);
});

test('removing a selected cover clears its file before registration', () => {
  const draft = loadDrafts(books, {});
  draft.tableProps.onUpdate('1', { coverUrl: '' });
  assert.equal(draft.current()[0].coverFile, undefined);
  assert.equal(draft.current()[0].coverUrl, '');
  assert.deepEqual(draft.revoked, ['blob:a']);
});

test('multiple local files are uploaded individually before registering the batch', async () => {
  const draft = loadDrafts(books, { ok: true, json: async () => ({ registered: 2, failed: [] }) });
  await draft.mutation.mutationFn(books);
  assert.deepEqual(draft.calls.map(({ url }) => url), ['/api/admin/books/cover', '/api/admin/books/cover', '/api/admin/books']);
  assert.ok(JSON.parse(draft.calls[2].options.body).books.every((book) => book.coverUrl === 'https://storage/uploaded.jpg'));
});
