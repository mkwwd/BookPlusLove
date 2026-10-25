import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

function loadRoute(result) {
  const calls = [];
  const query = {
    select() { return query; },
    eq(...args) { calls.push(['eq', ...args]); return query; },
    async maybeSingle() { return result; },
  };
  const dependencies = {
    'next/server': { NextResponse: { json(body, options) {
      const response = Response.json(body, options);
      response.cookies = { set(...args) { calls.push(['cookie', ...args]); } };
      return response;
    } } },
    '@/utils/supabase/server': { supabaseServer: {
      from(name) { calls.push(['from', name]); return query; },
      async rpc(...args) { calls.push(['rpc', ...args]); return result; },
    } },
  };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/api/notices/[noticeId]/view/route.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, { exports, require: (name) => dependencies[name] });
  return { calls, post: (id, cookie, origin = 'https://example.com') => exports.POST({
    nextUrl: new URL(`https://example.com/api/notices/${id}/view`), headers: new Headers({ origin }),
    cookies: { get: () => cookie ? { value: cookie } : undefined },
  }, { params: Promise.resolve({ noticeId: id }) }) };
}

test('first visit increments and sets a 600-second cookie scoped to this post', async () => {
  const route = loadRoute({ data: 1, error: null });
  const response = await route.post('1');
  assert.equal(response.status, 200);
  assert.equal((await response.json()).viewCount, 1);
  assert.equal(route.calls[0][1], 'increment_notice_view');
  const cookie = route.calls.find(([type]) => type === 'cookie');
  assert.equal(cookie[3].maxAge, 600);
  assert.equal(cookie[3].path, '/api/notices/1/view');
  assert.equal(cookie[3].httpOnly, true);
});
test('existing cookie reads current count without increment or extending expiry', async () => {
  const route = loadRoute({ data: { view_count: 7 }, error: null });
  const response = await route.post('1', '1');
  assert.equal((await response.json()).viewCount, 7);
  assert.ok(!route.calls.some(([type]) => type === 'rpc' || type === 'cookie'));
  assert.ok(route.calls.some(([type, field, value]) => type === 'eq' && field === 'is_published' && value === true));
});
test('after cookie expiry the next visit increments again', async () => {
  const route = loadRoute({ data: 8, error: null });
  assert.equal((await (await route.post('1')).json()).viewCount, 8);
  assert.equal(route.calls.filter(([type]) => type === 'rpc').length, 1);
});
test('invalid IDs and cross-origin writes never reach the database', async () => {
  const route = loadRoute({ data: 1, error: null });
  assert.equal((await route.post('-1')).status, 400);
  assert.equal((await route.post('1', undefined, 'https://other.com')).status, 403);
  assert.equal(route.calls.length, 0);
});
test('missing/private notices and DB errors never set a cookie', async () => {
  for (const [result, status] of [[{ data: null, error: null }, 404], [{ data: null, error: {} }, 500]]) {
    const route = loadRoute(result);
    assert.equal((await route.post('1')).status, status);
    assert.ok(!route.calls.some(([type]) => type === 'cookie'));
  }
});
