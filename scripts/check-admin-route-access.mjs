import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';

import ts from 'typescript';

const routes = [
  ['books', 'POST', '관리자만 도서를 등록할 수 있습니다.'],
  ['books/cover', 'POST', '관리자만 업로드할 수 있습니다.'],
  ['loans/scan', 'GET', '관리자만 조회할 수 있습니다.'],
  ['loans/return', 'POST', '관리자만 반납 처리할 수 있습니다.'],
  ['loans/[loanId]', 'PATCH', '관리자만 수정할 수 있습니다.'],
  ['loans/[loanId]/unreturn', 'POST', '관리자만 되돌릴 수 있습니다.'],
  ['members', 'GET', '관리자만 조회할 수 있습니다.'],
  ['users/search', 'GET', '관리자만 검색할 수 있습니다.'],
];

for (const [route, method, forbidden] of routes) {
  for (const role of [null, 'USER', 'admin', 'ADMIN']) {
    test(`${method} ${route}: ${role ?? 'signed out'}`, async () => {
      const nextStep = new Error('authorized handler reached');
      const user = role ? { email: 'A@example.com' } : null;
      let lookups = 0;
      const query = {
        select(column) {
          if (column !== 'role') throw nextStep;
          return query;
        },
        ilike(column, value) {
          assert.equal(column, 'email');
          assert.equal(value, user.email);
          return query;
        },
        async maybeSingle() {
          lookups++;
          return { data: { role } };
        },
      };
      function load(file) {
        if (file.endsWith('/supabase/route.ts')) {
          return { createRouteClient: async () => ({
            auth: { getUser: async () => ({ data: { user } }) },
          }) };
        }
        if (file.endsWith('/supabase/server.ts')) {
          return { supabaseServer: { from(table) {
            if (table !== 'users') throw nextStep;
            return query;
          } } };
        }
        const exports = {};
        const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
          compilerOptions: { module: ts.ModuleKind.CommonJS },
        });
        vm.runInNewContext(outputText, {
          exports, Response, URL,
          require(name) {
            const resolved = name.startsWith('@/')
              ? `src/${name.slice(2)}`
              : path.posix.join(path.posix.dirname(file), name);
            return load(`${resolved}.ts`);
          },
        });
        return exports;
      }
      const handler = load(`src/app/api/admin/${route}/route.ts`)[method];
      const request = new Proxy({}, { get() { throw nextStep; } });
      const context = { get params() { throw nextStep; } };
      // Parameter destructuring runs before authentication, so use a harmless
      // promise-like object that stops only when an authorized handler awaits it.
      Object.defineProperty(context, 'params', {
        get: () => ({ then() { throw nextStep; } }),
      });
      if (role === 'ADMIN') {
        await assert.rejects(handler(request, context), (error) => error === nextStep);
      } else {
        const response = await handler(request, context);
        assert.equal(response.status, role ? 403 : 401);
        assert.deepEqual(await response.json(), {
          error: role ? forbidden : '로그인이 필요합니다.',
        });
      }
      assert.equal(lookups, role ? 1 : 0);
    });
  }
}
