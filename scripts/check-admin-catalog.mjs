import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

import ts from 'typescript';

function load(path, dependencies = {}) {
  const exports = {};
  const { outputText } = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  });
  vm.runInNewContext(outputText, {
    exports,
    Response,
    console,
    require(name) {
      assert.ok(name in dependencies, name);
      return dependencies[name];
    },
  });
  return exports;
}
const validation = load('src/lib/adminCatalog.ts');
const parish = { parishname: '새 본당', is_verified: false };
const category = {
  code: '010',
  label: '성서일반',
  main_code: '000',
  main_label: '성서',
};

test('catalog input validation', () => {
  assert.equal(validation.parseParish(null).value, undefined);
  assert.equal(
    validation.parseParish({ ...parish, parishname: ' ' }).value,
    undefined,
  );
  assert.equal(
    validation.parseParish({ ...parish, is_verified: 'false' }).value,
    undefined,
  );
  assert.equal(
    validation.parseParish({ ...parish, parishname: '  새 본당  ' }).value
      .parishname,
    '새 본당',
  );
  assert.equal(validation.parseParish(parish).value.is_verified, false);
  for (const code of ['', '10', '1234', 'abc'])
    assert.equal(
      validation.parseCategory({ ...category, code }).value,
      undefined,
    );
  assert.equal(
    validation.parseCategory({ ...category, label: ' ' }).value,
    undefined,
  );
  assert.equal(validation.parseCategory(category).value.code, '010');
});

function setup(file, responses = [], authStatus = null) {
  const calls = [];
  const database = {
    from(table) {
      const result = responses.shift();
      assert.ok(result, `Unexpected database access: ${table}`);
      const chain = new Proxy(
        {},
        {
          get(_target, property) {
            if (property === 'then')
              return (resolve, reject) =>
                Promise.resolve(result).then(resolve, reject);
            return (...args) => {
              calls.push({ table, method: property, args });
              return chain;
            };
          },
        },
      );
      return chain;
    },
  };
  const helpers = load('src/utils/supabase/catalog.ts', {
    './server': { supabaseServer: database },
  });
  return {
    calls,
    handlers: load(file, {
      '@/lib/adminCatalog': validation,
      '@/utils/supabase/admin': {
        requireAdmin: async () => ({
          error: authStatus
            ? Response.json({ error: 'denied' }, { status: authStatus })
            : null,
        }),
      },
      '@/utils/supabase/server': { supabaseServer: database },
      '@/utils/supabase/catalog': helpers,
    }),
  };
}
const routes = [
  ['src/app/api/admin/parishes/route.ts', ['GET', 'POST']],
  ['src/app/api/admin/parishes/[parishId]/route.ts', ['PATCH', 'DELETE']],
  ['src/app/api/admin/categories/route.ts', ['GET', 'POST']],
  ['src/app/api/admin/categories/[code]/route.ts', ['PATCH', 'DELETE']],
];
const request = (body) =>
  new Request('http://localhost/api/test', {
    method: 'POST',
    body: JSON.stringify(body),
  });
const parishContext = { params: Promise.resolve({ parishId: '10' }) };
const categoryContext = { params: Promise.resolve({ code: '010' }) };

for (const [file, methods] of routes) {
  for (const method of methods) {
    test(`${file} ${method}: blocks unauthorized writes and reads`, async () => {
      for (const status of [401, 403]) {
        const { handlers, calls } = setup(file, [], status);
        assert.equal(
          (await handlers[method](request({}), parishContext)).status,
          status,
        );
        assert.equal(calls.length, 0);
      }
    });
  }
}

test('parish creation and approval persist the selected state', async () => {
  const created = setup(routes[0][0], [{ data: { id: 10 }, error: null }]);
  assert.equal((await created.handlers.POST(request(parish))).status, 201);
  assert.equal(
    created.calls.find((call) => call.method === 'insert').args[0].is_verified,
    false,
  );
  const edited = setup(routes[1][0], [{ data: { id: 10 }, error: null }]);
  assert.equal(
    (
      await edited.handlers.PATCH(
        request({ ...parish, is_verified: true }),
        parishContext,
      )
    ).status,
    200,
  );
  assert.equal(
    edited.calls.find((call) => call.method === 'update').args[0].is_verified,
    true,
  );
});

test('used parishes and categories cannot be deleted', async () => {
  for (const [file, context] of [
    [routes[1][0], parishContext],
    [routes[3][0], categoryContext],
  ]) {
    const { handlers, calls } = setup(file, [{ count: 2, error: null }]);
    assert.equal((await handlers.DELETE(request({}), context)).status, 409);
    assert.equal(
      calls.some((call) => call.method === 'delete'),
      false,
    );
  }
});

test('used category number cannot be changed', async () => {
  const { handlers, calls } = setup(routes[3][0], [{ count: 1, error: null }]);
  assert.equal(
    (
      await handlers.PATCH(
        request({ ...category, code: '011' }),
        categoryContext,
      )
    ).status,
    409,
  );
  assert.equal(
    calls.some((call) => call.method === 'update'),
    false,
  );
});

test('category label can be updated without changing its code', async () => {
  const { handlers, calls } = setup(routes[3][0], [
    { data: [{ main_label: '성서' }], error: null },
    { data: { code: '010' }, error: null },
  ]);
  assert.equal(
    (
      await handlers.PATCH(
        request({ ...category, label: '새 분류명' }),
        categoryContext,
      )
    ).status,
    200,
  );
  assert.equal(
    calls.find((call) => call.method === 'update').args[0].label,
    '새 분류명',
  );
});

test('conflicting main group name is rejected', async () => {
  const { handlers, calls } = setup(routes[2][0], [
    { data: [{ main_label: '성서' }], error: null },
  ]);
  assert.equal(
    (await handlers.POST(request({ ...category, main_label: '다른 이름' })))
      .status,
    409,
  );
  assert.equal(
    calls.some((call) => call.method === 'insert'),
    false,
  );
});

test('missing and concurrently referenced parish deletions are handled', async () => {
  for (const [result, status] of [
    [{ data: null, error: null }, 404],
    [{ error: { code: '23503', message: 'foreign key' } }, 409],
  ]) {
    const { handlers } = setup(routes[1][0], [
      { count: 0, error: null },
      result,
    ]);
    assert.equal(
      (await handlers.DELETE(request({}), parishContext)).status,
      status,
    );
  }
});

test('duplicate categories return a conflict', async () => {
  const { handlers } = setup(routes[2][0], [
    { data: [], error: null },
    { error: { code: '23505', message: 'duplicate' } },
  ]);
  assert.equal((await handlers.POST(request(category))).status, 409);
});
