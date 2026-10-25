import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

import ts from 'typescript';

const base = 'https://library.supabase.co/storage/v1/object/public/book-covers/';
const cover = `${base}12345678-1234-1234-1234-123456789abc.jpg`;

function loadCleanup({ data = [], error = null, removeError = null, throws = false } = {}) {
  const calls = [];
  const query = {
    select() { return query; },
    like(column, pattern) {
      assert.equal(column, 'cover_url');
      assert.equal(pattern, `${cover}%`);
      return query;
    },
    async limit() {
      if (throws) throw new Error('offline');
      return { data, error };
    },
  };
  const supabaseServer = {
    from(table) { assert.equal(table, 'books'); calls.push('lookup'); return query; },
    storage: { from(bucket) {
      assert.equal(bucket, 'book-covers');
      return {
        getPublicUrl: (path) => ({ data: { publicUrl: `${base}${path}` } }),
        async remove(paths) { calls.push([...paths]); return { error: removeError }; },
      };
    } },
  };
  const exports = {};
  const source = fs.readFileSync('src/utils/supabase/bookCover.ts', 'utf8');
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports, Response, URL,
    require: (name) => { assert.equal(name, './server'); return { supabaseServer }; },
  });
  return { cleanup: exports.withBookCoverCleanup, calls };
}

test('unused uploaded cover is deleted once after processing', async () => {
  const { cleanup, calls } = loadCleanup();
  const response = await cleanup([cover, cover], Response.json({ registered: 0 }, { status: 400 }));
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { registered: 0 });
  assert.deepEqual(calls, ['lookup', ['12345678-1234-1234-1234-123456789abc.jpg']]);
});

test('shared/current covers are never removed', async () => {
  const { cleanup, calls } = loadCleanup({ data: [{ id: 7 }] });
  await cleanup([cover], Response.json({ ok: true }));
  assert.deepEqual(calls, ['lookup']);
});

test('external URLs, other buckets and malformed paths are ignored', async () => {
  const { cleanup, calls } = loadCleanup();
  await cleanup([
    null, undefined, '', 123, 'blob:preview',
    cover.replace('library.supabase.co', 'other.supabase.co'),
    cover.replace('book-covers', 'private-files'),
    `${cover}?download=1`, `${base}../secret.jpg`, `${base}%2E%2E/secret.jpg`,
  ], Response.json({ ok: true }));
  assert.deepEqual(calls, []);
});

for (const scenario of [{ error: { message: 'denied' } }, { data: null }, { throws: true }]) {
  test(`lookup failure preserves file: ${JSON.stringify(scenario)}`, async () => {
    const { cleanup, calls } = loadCleanup(scenario);
    const response = await cleanup([cover], Response.json({ ok: true }));
    assert.deepEqual(calls, ['lookup']);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).coverWarnings.length, 1);
  });
}

test('storage failure warns without turning a saved book into a failed save', async () => {
  const { cleanup } = loadCleanup({ removeError: { message: 'denied' } });
  const response = await cleanup([cover], Response.json({ ok: true }));
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.coverWarnings.length, 1);
});
