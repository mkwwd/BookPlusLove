import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';

import ts from 'typescript';

const base = 'https://library.supabase.co/storage/v1/object/public/book-covers/';
const oldPath = '11111111-1111-1111-1111-111111111111.jpg';
const newPath = '22222222-2222-2222-2222-222222222222.jpg';
const oldUrl = base + oldPath;
const newUrl = base + newPath;
const copy = { id: 1, book_id: 2, books: { cover_url: oldUrl } };
const body = { title: 'Book', regNo: 'MB000001', status: '대여가능', coverUrl: newUrl };
const step = (table, data = null, error = null) => ({ table, data, error });

function loadRoute(route, steps, authorized = true) {
  const removed = [];
  const supabaseServer = {
    from(table) {
      const result = steps.shift();
      assert.ok(result, `unexpected query: ${table}`);
      assert.equal(table, result.table);
      const builder = new Proxy({}, {
        get(_, key) {
          if (key === 'then') return (resolve, reject) => Promise.resolve(result).then(resolve, reject);
          return () => builder;
        },
      });
      return builder;
    },
    storage: { from: () => ({
      getPublicUrl: (name) => ({ data: { publicUrl: base + name } }),
      remove: async (paths) => { removed.push(...paths); return { error: null }; },
    }) },
  };
  function load(file) {
    if (file.endsWith('/supabase/server.ts')) return { supabaseServer };
    if (file.endsWith('/supabase/admin.ts')) return {
      requireAdmin: async () => ({ error: authorized ? null : Response.json({ error: 'denied' }, { status: 403 }) }),
    };
    const exports = {};
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText, {
      exports, Response, URL,
      require(name) {
        return load((name.startsWith('@/') ? `src/${name.slice(2)}` : path.posix.join(path.posix.dirname(file), name)) + '.ts');
      },
    });
    return exports;
  }
  return { api: load(`src/app/api/admin/books/${route}`), removed };
}

for (const [name, updateError, copyError, expectedRemoved] of [
  ['replace', null, null, [oldPath]],
  ['book update fails', { message: 'failed' }, null, [newPath]],
  ['copy update fails after book saved', null, { message: 'failed' }, [oldPath]],
]) {
  test(`PATCH ${name}`, async () => {
    const steps = [step('book_copies', copy), step('books', null, updateError)];
    if (!updateError) steps.push(step('book_copies', null, copyError));
    steps.push(step('books', updateError ? [] : [{ id: 2 }]));
    steps.push(step('books', updateError ? [{ id: 2 }] : []));
    const { api, removed } = loadRoute('[copyId]/route.ts', steps);
    const response = await api.PATCH({ json: async () => body }, { params: Promise.resolve({ copyId: '1' }) });
    assert.equal(response.status, updateError || copyError ? 500 : 200);
    assert.deepEqual(removed, expectedRemoved);
    assert.equal(steps.length, 0);
  });
}

test('PATCH keeps a replaced cover shared by another book', async () => {
  const steps = [step('book_copies', copy), step('books'), step('book_copies'), step('books', [{ id: 2 }]), step('books', [{ id: 3 }])];
  const { api, removed } = loadRoute('[copyId]/route.ts', steps);
  await api.PATCH({ json: async () => body }, { params: Promise.resolve({ copyId: '1' }) });
  assert.deepEqual(removed, []);
  assert.equal(steps.length, 0);
});

for (const [name, steps, payload, expectedRemoved, expectedStatus] of [
  ['existing ISBN ignores new cover', [step('books', { id: 2 }), step('book_copies'), step('books', [])], { ...body, isbn: '9781234567897' }, [newPath], 200],
  ['insert failure', [step('books', null, { message: 'failed' }), step('books', [])], body, [newPath], 200],
  ['validation failure', [step('books', [])], { ...body, title: '' }, [newPath], 400],
  ['new book still references cover after copy failure', [step('books', { id: 2 }), step('book_copies', null, { message: 'failed' }), step('books', [{ id: 2 }])], body, [], 200],
]) {
  test(`POST ${name}`, async () => {
    const { api, removed } = loadRoute('route.ts', steps);
    const response = await api.POST({ json: async () => ({ books: [payload] }) });
    assert.equal(response.status, expectedStatus);
    assert.deepEqual(removed, expectedRemoved);
    assert.equal(steps.length, 0);
  });
}

test('unauthorized requests never clean up files', async () => {
  const { api, removed } = loadRoute('route.ts', [], false);
  assert.equal((await api.POST({ json: async () => ({ books: [body] }) })).status, 403);
  assert.deepEqual(removed, []);
});
