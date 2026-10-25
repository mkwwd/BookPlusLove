import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

import ts from 'typescript';

const { outputText } = ts.transpileModule(
  fs.readFileSync('src/components/NoticeManager.tsx', 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } },
);

for (const isLoading of [true, false]) {
  test(`notice manager retains its admin form: loading=${isLoading}`, async () => {
    let query;
    const mutations = [];
    const dependencies = {
      react: { useState: (value) => [value, () => {}] },
      '@tanstack/react-query': {
        useQueryClient: () => ({}),
        useQuery: (options) => { query = options; return { data: [], isLoading }; },
        useMutation: (options) => { mutations.push(options); return {}; },
      },
      'next/navigation': { useRouter: () => ({}) },
      'lucide-react': {},
      '@/lib/notices': {},
      'react/jsx-runtime': {
        jsx: (type, props) => ({ type, props }),
        jsxs: (type, props) => ({ type, props }),
      },
    };
    const exports = {};
    vm.runInNewContext(outputText, {
      exports,
      require: (name) => dependencies[name],
      fetch: async () => ({ ok: false, status: 403, json: async () => ({ error: 'forbidden' }) }),
    });
    const tree = exports.default({});
    assert.equal(tree.props.className, 'space-y-6');
    const nodes = [];
    function visit(node) {
      if (Array.isArray(node)) return node.forEach(visit);
      if (!node || typeof node !== 'object') return;
      nodes.push(node);
      visit(node.props?.children);
    }
    visit(tree);
    assert.equal(nodes.filter((node) => node.type === 'form').length, 1);
    assert.equal(nodes.filter((node) => node.type === 'h2').length, 0);
    assert.equal(nodes.filter((node) => node.type === 'input').length, 4);
    assert.equal(mutations.length, 2);
    assert.equal(query.queryKey[0], 'admin-notices');
    await assert.rejects(query.queryFn(), /forbidden/);
    assert.ok(JSON.stringify(tree).includes(isLoading ? '불러오는 중...' : '등록된 공지사항이 없습니다.'));
  });
}
