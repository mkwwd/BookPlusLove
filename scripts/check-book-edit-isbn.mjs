import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

import ts from 'typescript';

function load(file, overrides = {}, extra = '', globals = {}) {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(file, 'utf8') + extra, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText,
    {
      exports,
      Response,
      URL,
      require(name) {
        if (name in overrides) return overrides[name];
        if (name.startsWith('@/lib/')) return load(`src/${name.slice(2)}.ts`);
        return {};
      },
      ...globals,
    },
  );
  return exports;
}

test('save validator accepts ISBN-10 including X and ISBN-13, not malformed checksums or text', () => {
  const { isValidIsbn } = load('src/lib/isbn.ts');
  assert.equal(typeof isValidIsbn, 'function');
  for (const value of [
    '0-306-40615-2',
    '0-8044-2957-X',
    '080442957x',
    '9780306406157',
    '978-0-306-40615-7',
  ]) {
    assert.equal(isValidIsbn(value), true, value);
  }
  for (const value of [
    '0306406153',
    '0804429570',
    '9780306406158',
    'ISBN9780306406157',
    '123',
    '',
  ]) {
    assert.equal(isValidIsbn(value), false, value);
  }
});

function patchFixture(existingIsbn = null, updateError = null) {
  const writes = [];
  const supabaseServer = {
    from(table) {
      let isWrite = false;
      const query = new Proxy(
        {},
        {
          get(_, property) {
            if (property === 'then')
              return (resolve, reject) =>
                Promise.resolve({
                  data: isWrite
                    ? null
                    : {
                        id: 1,
                        book_id: 2,
                        books: {
                          isbn: existingIsbn,
                          cover_url: null,
                          pub_date: null,
                        },
                      },
                  error: isWrite ? updateError : null,
                }).then(resolve, reject);
            return (...args) => {
              if (property === 'update') {
                isWrite = true;
                writes.push({ table, values: args[0] });
              }
              return query;
            };
          },
        },
      );
      return query;
    },
  };
  const { PATCH } = load('src/app/api/admin/books/[copyId]/route.ts', {
    '@/utils/supabase/server': { supabaseServer },
    '@/utils/supabase/admin': { requireAdmin: async () => ({ error: null }) },
    '@/utils/supabase/bookCover': {
      withBookCoverCleanup: async (_, response) => response,
    },
  });
  return {
    writes,
    patch: (isbn) =>
      PATCH(
        {
          json: async () => ({
            title: 'Book',
            regNo: 'MB000001',
            status: '대여가능',
            isbn,
          }),
        },
        { params: Promise.resolve({ copyId: '1' }) },
      ),
  };
}

test('PATCH stores old ISBN without converting it, preserves unchanged legacy values and rejects new invalid values', async () => {
  for (const [existing, input, status] of [
    [null, '0-306-40615-2', 200],
    [null, '0-8044-2957-X', 200],
    [null, '9780306406157', 200],
    ['old-typo', 'old-typo', 200],
    ['old-typo', '9780306406158', 400],
    [null, '0306406153', 400],
    ['0-306-40615-2', '', 200],
  ]) {
    const fixture = patchFixture(existing);
    const response = await fixture.patch(input);
    assert.equal(response.status, status, input);
    if (status === 200)
      assert.equal(fixture.writes[0].values.isbn, input || null);
    else assert.equal(fixture.writes.length, 0);
  }
  const fixture = patchFixture(null, { code: '23505' });
  assert.equal((await fixture.patch('0-306-40615-2')).status, 500);
});

function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== 'object') return [];
  return [tree, ...nodes(tree.props?.children)];
}

test('ISBN actions sit below the scroll body and preserve apply and close handlers', () => {
  const jsx = {
    jsx: (type, props) => ({ type, props }),
    jsxs: (type, props) => ({ type, props }),
  };
  const { default: Compare } = load('src/components/IsbnCompareModal.tsx', {
    react: { useState: (initial) => [initial(), () => {}] },
    'react/jsx-runtime': jsx,
  });
  let closed = 0;
  let applied = 0;
  const comparison = Compare({
    fields: ['title'],
    result: { aladin: null, nationalLibrary: null },
    currentValues: { title: 'Book' },
    onClose: () => closed++,
    onApply: () => applied++,
  });
  assert.ok(
    comparison.props.footer,
    'actions must be passed outside the scrolling content',
  );
  const buttons = nodes(comparison.props.footer).filter(
    (n) => n.type === 'button',
  );
  assert.deepEqual(
    buttons.map((n) => n.props.children),
    ['취소', '가져오기'],
  );
  buttons[0].props.onClick();
  buttons[1].props.onClick();
  assert.equal(closed, 1);
  assert.equal(applied, 1);
  const { default: Modal } = load('src/components/Modal.tsx', {
    'react/jsx-runtime': jsx,
  });
  const shell = Modal(comparison.props).props.children;
  const [, body, footer] = shell.props.children;
  assert.match(body.props.className, /min-h-0/);
  assert.match(body.props.className, /overflow-y-auto/);
  assert.equal(footer.props.children, comparison.props.footer);
  assert.match(footer.props.className, /shrink-0/);
  assert.ok(!nodes(body).some((n) => n.props.children === '가져오기'));
  const ordinary = Modal({ title: 'Test', onClose() {}, children: 'Content' })
    .props.children;
  assert.ok(
    !ordinary.props.children[2],
    'existing modals must not gain an empty footer',
  );
});

test('ISBN lookup sends a bounded request and explains a timeout', async () => {
  let duration;
  const signal = AbortSignal.abort(
    new DOMException('Timed out', 'TimeoutError'),
  );
  const { fetchIsbnLookup } = load(
    'src/components/IsbnCompareModal.tsx',
    {},
    '',
    {
      AbortSignal: {
        timeout: (ms) => {
          duration = ms;
          return signal;
        },
      },
      fetch: async (_, options) => {
        assert.equal(options?.signal, signal);
        throw signal.reason;
      },
    },
  );
  await assert.rejects(fetchIsbnLookup('89-01-15084-0'), /조회 시간이 초과/);
  assert.equal(duration, 20000);
});

test('ISBN comparison enlarges desktop covers without cropping and keeps compact side-by-side choices on mobile', () => {
  const { default: Compare } = load('src/components/IsbnCompareModal.tsx', {
    react: { useState: (initial) => [initial(), () => {}] },
    'react/jsx-runtime': {
      jsx: (type, props) => ({ type, props }),
      jsxs: (type, props) => ({ type, props }),
    },
  });
  const urls = [
    'https://example.com/aladin.jpg',
    'https://example.com/library.jpg',
    'https://example.com/current.jpg',
  ];
  const tree = nodes(
    Compare({
      fields: ['coverUrl'],
      result: {
        aladin: { coverUrl: urls[0] },
        nationalLibrary: { coverUrl: urls[1] },
      },
      currentValues: { coverUrl: urls[2] },
      onApply() {},
      onClose() {},
    }),
  );
  const images = tree.filter((node) => node.type === 'img');
  assert.deepEqual(
    images.map((node) => node.props.src),
    urls,
  );
  for (const image of images) {
    for (const className of [
      'h-24',
      'w-16',
      'sm:h-48',
      'sm:w-36',
      'max-w-full',
      'object-contain',
    ])
      assert.ok(
        image.props.className.split(' ').includes(className),
        className,
      );
    assert.ok(!image.props.className.includes('object-cover'));
  }
  const choices = tree.find(
    (node) =>
      node.type === 'div' &&
      nodes(node).filter((child) => child.type === 'img').length === 3 &&
      node.props.className === 'flex gap-2',
  );
  assert.ok(
    choices,
    'cover choices must remain side by side at every viewport',
  );
});

test('successful edit closes the modal and leaves a dismissible success notice; opening another edit clears it', () => {
  const states = [];
  let cursor = 0;
  let invalidations = 0;
  const book = {
    copyId: 1,
    bookId: 2,
    title: 'Book',
    isbn: '0-306-40615-2',
    regNo: 'MB000001',
    status: '대여가능',
    pubDate: null,
  };
  const { default: Page } = load('src/app/(page)/admin/books/page.tsx', {
    react: {
      useEffect() {},
      useState(initial) {
        const i = cursor++;
        if (!(i in states)) states[i] = initial;
        return [
          states[i],
          (value) => {
            states[i] = value;
          },
        ];
      },
    },
    '@tanstack/react-query': {
      useQueryClient: () => ({
        invalidateQueries: () => {
          invalidations++;
        },
      }),
      useQuery: ({ queryKey }) => ({
        data:
          queryKey[0] === 'admin-books'
            ? { books: [book], total: 1, page: 1, pageSize: 50 }
            : [],
      }),
      useMutation: () => ({ mutate() {} }),
    },
    '@/hooks/useHorizontalWheel': {
      useHorizontalWheel: () => ({ current: null }),
    },
    'react/jsx-runtime': {
      jsx: (type, props) => ({ type, props }),
      jsxs: (type, props) => ({ type, props }),
    },
  });
  const render = () => {
    cursor = 0;
    return nodes(Page());
  };
  let tree = render();
  assert.equal(
    tree.some((n) => n.props?.role === 'status'),
    false,
  );
  tree.find((n) => n.props?.['aria-label'] === '수정').props.onClick();
  tree = render();
  const form = tree.find((n) => n.type?.name === 'EditBookForm');
  assert.ok(form);
  form.props.onSaved();
  tree = render();
  assert.equal(
    tree.some((n) => n.type?.name === 'EditBookForm'),
    false,
  );
  assert.ok(tree.find((n) => n.props?.role === 'status'));
  assert.equal(invalidations, 1);
  tree.find((n) => n.props?.['aria-label'] === '알림 닫기').props.onClick();
  assert.equal(
    render().some((n) => n.props?.role === 'status'),
    false,
  );
  tree.find((n) => n.props?.['aria-label'] === '수정').props.onClick();
  render()
    .find((n) => n.type?.name === 'EditBookForm')
    .props.onSaved();
  render()
    .find((n) => n.props?.['aria-label'] === '수정')
    .props.onClick();
  assert.equal(
    render().some((n) => n.props?.role === 'status'),
    false,
  );
});

test('edit form accepts an old ISBN and calls onSaved only after PATCH succeeds', async () => {
  for (const ok of [true, false]) {
    let saved = 0;
    let sent;
    let pending;
    let error;
    const { EditBookForm } = load(
      'src/app/(page)/admin/books/page.tsx',
      {
        react: { useState: (initial) => [initial, () => {}] },
        '@tanstack/react-query': {
          useMutation: (options) => ({
            mutate() {
              pending = options
                .mutationFn()
                .then(() => options.onSuccess?.())
                .catch((e) => {
                  error = e;
                });
            },
          }),
        },
        'react/jsx-runtime': {
          jsx: (type, props) => ({ type, props }),
          jsxs: (type, props) => ({ type, props }),
        },
      },
      '\nexport { EditBookForm };',
      {
        fetch: async (_, options) => {
          sent = JSON.parse(options.body);
          return Response.json(ok ? { ok: true } : { error: 'Save failed' }, {
            status: ok ? 200 : 500,
          });
        },
      },
    );
    const tree = nodes(
      EditBookForm({
        book: {
          copyId: 1,
          title: 'Book',
          isbn: '0-8044-2957-X',
          regNo: 'MB000001',
          status: '대여가능',
        },
        categories: [],
        onSaved: () => {
          saved++;
        },
        onDelete() {},
        isDeleting: false,
      }),
    );
    tree
      .find((n) => n.type === 'button' && n.props.children === '저장')
      .props.onClick();
    assert.ok(pending, 'Save mutation must run for an ISBN-10 book');
    await pending;
    assert.equal(sent.isbn, '0-8044-2957-X');
    assert.equal(saved, ok ? 1 : 0);
    assert.equal(Boolean(error), !ok);
  }
});
