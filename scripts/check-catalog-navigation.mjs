import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

import ts from 'typescript';

function loadComponent(
  path,
  { pathname = '/admin', tab, extra = '', overrides = {}, globals = {} } = {},
) {
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
    '@/hooks/useHorizontalWheel': {
      useHorizontalWheel: () => ({ current: null }),
    },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    ...overrides,
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
    { exports, require: (name) => dependencies[name] ?? {}, ...globals },
  );
  return exports;
}

function catalogHarness(props, entries, groupEntries = []) {
  const states = [];
  let cursor = 0;
  const mutations = [];
  const requests = [];
  const invalidated = [];
  const component = loadComponent('src/components/CatalogManager.tsx', {
    overrides: {
      react: {
        useState(initial) {
          const index = cursor++;
          if (!(index in states)) states[index] = initial;
          return [
            states[index],
            (value) => {
              states[index] = value;
            },
          ];
        },
      },
      '@tanstack/react-query': {
        useQuery: ({ queryKey }) => ({
          data:
            props.kind === 'categories' &&
            queryKey[0] === 'admin-category-groups'
              ? groupEntries
              : entries,
        }),
        useQueryClient: () => ({
          invalidateQueries: async ({ queryKey }) =>
            invalidated.push(queryKey[0]),
        }),
        useMutation: (options) => {
          mutations.push(options);
          return { reset() {} };
        },
      },
    },
    globals: {
      fetch: async (url, options) => {
        requests.push({ url, ...options });
        return { ok: true, json: async () => ({}) };
      },
    },
  }).default;
  return {
    mutations,
    requests,
    invalidated,
    render() {
      cursor = 0;
      mutations.length = 0;
      return component(props);
    },
  };
}

const textContent = (node) =>
  typeof node === 'string' || typeof node === 'number'
    ? String(node)
    : Array.isArray(node)
      ? node.map(textContent).join('')
      : textContent(node?.props?.children ?? '');

test('groups open their own child list and can return to the group list', () => {
  const harness = catalogHarness({ kind: 'category-groups' }, [
    { key: '000', name: '성서', usageCount: 2 },
    { key: '100', name: '빈 대분류', usageCount: 0 },
  ]);
  let tree = harness.render();
  assert.ok(textContent(tree).includes('대분류 추가'));
  nodes(tree)
    .find((node) => node.props['aria-label'] === '100 빈 대분류 소분류 보기')
    .props.onClick();
  tree = harness.render();
  assert.equal(tree.props.kind, 'categories');
  assert.equal(tree.props.group.code, '100');
  tree.props.onBack();
  assert.ok(textContent(harness.render()).includes('대분류 추가'));
});

test('child list is scoped and creation uses only its selected parent code', async () => {
  let returned = false;
  const harness = catalogHarness(
    {
      kind: 'categories',
      group: { code: '000', label: '성서' },
      onBack: () => {
        returned = true;
      },
    },
    [
      { key: '010', name: '성서일반', mainCode: '000', usageCount: 2 },
      { key: '110', name: '다른 소분류', mainCode: '100', usageCount: 0 },
    ],
  );
  let tree = harness.render();
  assert.ok(textContent(tree).includes('성서일반'));
  assert.ok(!textContent(tree).includes('다른 소분류'));
  nodes(tree)
    .find(
      (node) =>
        node.type === 'button' && textContent(node).includes('소분류 추가'),
    )
    .props.onClick();
  tree = harness.render();
  assert.ok(!nodes(tree).some((node) => node.type === 'datalist'));
  await harness.mutations[0].mutationFn();
  assert.equal(JSON.parse(harness.requests[0].body).main_code, '000');
  assert.equal(JSON.parse(harness.requests[0].body).main_label, undefined);
  await harness.mutations[0].onSuccess();
  for (const key of [
    'admin-categories',
    'admin-category-groups',
    'book-categories',
    'admin-books',
  ])
    assert.ok(harness.invalidated.includes(key));
  nodes(tree)
    .find(
      (node) =>
        node.type === 'button' && textContent(node).includes('대분류 목록으로'),
    )
    .props.onClick();
  assert.equal(returned, true);
});

test('group editing locks a used code but leaves its label editable', () => {
  const harness = catalogHarness({ kind: 'category-groups' }, [
    { key: '000', name: '성서', usageCount: 2 },
  ]);
  let tree = harness.render();
  assert.equal(
    nodes(tree).find((node) => node.props['aria-label'] === '성서 삭제').props
      .disabled,
    true,
  );
  nodes(tree)
    .find((node) => node.props['aria-label'] === '성서 수정')
    .props.onClick();
  tree = harness.render();
  const inputs = nodes(tree).filter((node) => node.type === 'input');
  assert.equal(
    inputs.find((node) => node.props.value === '000').props.disabled,
    true,
  );
  assert.ok(!inputs.find((node) => node.props.value === '성서').props.disabled);
});

test('a used subcategory can move to another parent without changing its code', async () => {
  const harness = catalogHarness(
    { kind: 'categories', group: { code: '000', label: '성서' }, onBack() {} },
    [{ key: '010', name: '성서일반', mainCode: '000', usageCount: 2 }],
    [
      { key: '000', name: '성서', usageCount: 1 },
      { key: '100', name: '새 대분류', usageCount: 0 },
    ],
  );
  nodes(harness.render())
    .find((node) => node.props['aria-label'] === '성서일반 수정')
    .props.onClick();
  let tree = harness.render();
  const select = nodes(tree).find((node) => node.type === 'select');
  assert.equal(
    nodes(select).filter((node) => node.type === 'option').length,
    2,
  );
  select.props.onChange({ target: { value: '100' } });
  tree = harness.render();
  assert.equal(
    nodes(tree).find(
      (node) => node.type === 'input' && node.props.value === '010',
    ).props.disabled,
    true,
  );
  await harness.mutations[0].mutationFn();
  const sent = harness.requests[0];
  assert.equal(sent.method, 'PATCH');
  assert.equal(sent.url, '/api/admin/categories/010');
  assert.deepEqual(JSON.parse(sent.body), {
    code: '010',
    label: '성서일반',
    main_code: '100',
  });
});

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
  ['category-groups', '/admin/books'],
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
