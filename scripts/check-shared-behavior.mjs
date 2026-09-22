import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

import ts from 'typescript';

function loadModule(path, dependencies) {
  const { outputText } = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  });
  const exports = {};
  vm.runInNewContext(outputText, {
    exports,
    Response,
    require(name) {
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  });
  return exports;
}

for (const scenario of [
  { name: 'signed out', user: null, role: null, status: 401 },
  { name: 'missing email', user: {}, role: null, status: 401 },
  {
    name: 'missing profile',
    user: { email: 'A@example.com' },
    role: null,
    status: 403,
  },
  {
    name: 'ordinary member',
    user: { email: 'A@example.com' },
    role: 'USER',
    status: 403,
  },
  {
    name: 'lowercase role',
    user: { email: 'A@example.com' },
    role: 'admin',
    status: 403,
  },
  {
    name: 'administrator',
    user: { email: 'A@example.com' },
    role: 'ADMIN',
    status: null,
  },
]) {
  test(`admin guard: ${scenario.name}`, async () => {
    let lookups = 0;
    const query = {
      select(column) {
        assert.equal(column, 'role');
        return query;
      },
      ilike(column, value) {
        assert.equal(column, 'email');
        assert.equal(value, scenario.user.email);
        return query;
      },
      async maybeSingle() {
        return { data: scenario.role ? { role: scenario.role } : null };
      },
    };
    const { requireAdmin } = loadModule('src/utils/supabase/admin.ts', {
      './route': {
        createRouteClient: async () => ({
          auth: { getUser: async () => ({ data: { user: scenario.user } }) },
        }),
      },
      './server': {
        supabaseServer: {
          from(table) {
            assert.equal(table, 'users');
            lookups++;
            return query;
          },
        },
      },
    });
    const result = await requireAdmin();
    assert.equal(result.email, scenario.user?.email ?? null);
    assert.equal(result.error?.status ?? null, scenario.status);
    assert.equal(lookups, scenario.user?.email ? 1 : 0);
    if (result.error) {
      assert.deepEqual(await result.error.json(), {
        error:
          scenario.status === 401
            ? '로그인이 필요합니다.'
            : '관리자만 이용할 수 있습니다.',
      });
    }
  });
}

test('horizontal wheel: overflow, scrollbar exclusion and cleanup', () => {
  let effect;
  let listener;
  let removed = false;
  const element = {
    scrollWidth: 1000,
    clientWidth: 500,
    scrollLeft: 0,
    getBoundingClientRect: () => ({ right: 500 }),
    addEventListener(type, callback, options) {
      assert.equal(type, 'wheel');
      assert.equal(options.passive, false);
      listener = callback;
    },
    removeEventListener(type, callback) {
      assert.equal(type, 'wheel');
      assert.equal(callback, listener);
      removed = true;
    },
  };
  const { useHorizontalWheel } = loadModule('src/hooks/useHorizontalWheel.ts', {
    react: {
      useRef: () => ({ current: element }),
      useEffect: (callback) => {
        effect = callback;
      },
    },
  });
  assert.equal(useHorizontalWheel().current, element);
  const cleanup = effect();
  let prevented = 0;
  const event = {
    clientX: 200,
    deltaX: 0,
    deltaY: 80,
    preventDefault: () => prevented++,
  };
  listener(event);
  assert.equal(element.scrollLeft, 80);
  assert.equal(prevented, 1);
  listener({ ...event, clientX: 480 });
  listener({ ...event, deltaX: 100 });
  element.scrollWidth = 500;
  listener(event);
  assert.equal(element.scrollLeft, 80);
  assert.equal(prevented, 1);
  cleanup();
  assert.equal(removed, true);
});
