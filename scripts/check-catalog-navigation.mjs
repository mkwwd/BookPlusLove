import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

import ts from 'typescript';

function loadComponent(path, { pathname = '/admin', tab, extra = '' } = {}) {
  const source = fs.readFileSync(path, 'utf8');
  const jsx = (type, props) => ({ type, props });
  const dependencies = {
    react: {
      useState: (initial) => [
        initial === false
          ? true
          : tab && ['admin', 'all'].includes(initial)
            ? tab
            : initial,
        () => {},
      ],
      useRef: () => ({ current: null }),
      useEffect: () => {},
    },
    '@tanstack/react-query': {
      useQuery: () => ({ data: [] }),
      useQueryClient: () => ({}),
      useMutation: () => ({}),
    },
    'next/link': { default: 'a' },
    'next/navigation': { usePathname: () => pathname },
    'react/jsx-runtime': { jsx, jsxs: jsx },
  };
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(`${source}\n${extra}`, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText,
    { exports, require: (name) => dependencies[name] ?? {} },
  );
  return exports;
}

function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree?.props) return [];
  return [tree, ...nodes(tree.props.children)];
}

const adminRoot = 'src/app/(page)/admin';

for (const [pathname, parent] of [
  ['/admin/parishes', '/admin/members'],
  ['/admin/categories', '/admin/books'],
]) {
  test(`${pathname} highlights its parent in desktop and mobile navigation`, () => {
    const nav = loadComponent(`${adminRoot}/AdminNav.tsx`, {
      pathname,
    }).default();
    const links = nodes(nav).filter((node) => node.type === 'a');
    assert.equal(
      links.some((node) =>
        ['/admin/parishes', '/admin/categories'].includes(node.props.href),
      ),
      false,
    );
    const active = links.filter((node) =>
      node.props.className.includes('text-red-900'),
    );
    assert.equal(active.length, 2);
    assert.ok(active.every((node) => node.props.href === parent));
  });
}

test('dashboard contains only the parent management entry points', () => {
  const { QUICK_LINKS } = loadComponent(`${adminRoot}/page.tsx`, {
    extra: 'export { QUICK_LINKS };',
  });
  assert.equal(
    QUICK_LINKS.some((link) =>
      ['/admin/parishes', '/admin/categories'].includes(link.href),
    ),
    false,
  );
  assert.ok(QUICK_LINKS.some((link) => link.href === '/admin/members'));
  assert.ok(QUICK_LINKS.some((link) => link.href === '/admin/books'));
});

for (const tab of ['admin', 'regular']) {
  test(`member ${tab} tab retains the parish management link`, () => {
    const page = loadComponent(`${adminRoot}/members/page.tsx`, {
      tab,
    }).default();
    assert.equal(
      nodes(page).filter(
        (node) => node.type === 'a' && node.props.href === '/admin/parishes',
      ).length,
      1,
    );
  });
}

for (const tab of ['all', 'recommended']) {
  test(`book ${tab} tab retains the category management link`, () => {
    const page = loadComponent(`${adminRoot}/books/page.tsx`, {
      tab,
    }).default();
    assert.equal(
      nodes(page).filter(
        (node) => node.type === 'a' && node.props.href === '/admin/categories',
      ).length,
      1,
    );
  });
}

for (const [kind, href] of [
  ['parishes', '/admin/members'],
  ['categories', '/admin/books'],
]) {
  test(`${kind} has a link back to its parent management page`, () => {
    const page = loadComponent('src/components/CatalogManager.tsx').default({
      kind,
    });
    assert.equal(
      nodes(page).filter(
        (node) => node.type === 'a' && node.props.href === href,
      ).length,
      1,
    );
  });
}
