import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

import { createClient } from '@supabase/supabase-js';
import ts from 'typescript';

function load(file, dependencies, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  vm.runInNewContext(code, {
    exports,
    Request,
    Response,
    URL,
    URLSearchParams,
    ...globals,
    require: (name) => dependencies[name] ?? {},
  });
  return exports;
}

function api({ total = 121, authError, dbError, listError } = {}) {
  const calls = [];
  const supabaseServer = createClient(
    'https://example.supabase.co',
    'test-key',
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: async (url, options) => {
          const params = new URL(url).searchParams;
          calls.push({ params, method: options.method });
          const error =
            dbError ?? (options.method === 'GET' ? listError : null);
          if (error) return Response.json({ message: error }, { status: 500 });
          if (options.method === 'HEAD')
            return new Response(null, {
              headers: { 'content-range': `*/${total}` },
            });
          const offset = Number(params.get('offset') ?? 0);
          const limit = Number(params.get('limit') ?? 1000);
          const rows = Array.from(
            { length: Math.max(0, Math.min(limit, total - offset)) },
            (_, i) => ({
              id: total - offset - i,
              reg_no: `MB${String(total - offset - i).padStart(6, '0')}`,
              status: '대여가능',
              donor_name: null,
              donor_user_id: null,
              books: {
                id: 1,
                title: 'First book',
                author: 'Alice',
                book_categories: null,
                is_recommended: false,
              },
            }),
          );
          return Response.json(rows, {
            headers: {
              'content-range': `${offset}-${offset + rows.length - 1}/${total}`,
            },
          });
        },
      },
    },
  );
  const { GET } = load('src/app/api/admin/books/route.ts', {
    '@/utils/supabase/admin': {
      requireAdmin: async () => ({ error: authError }),
    },
    '@/utils/supabase/server': { supabaseServer },
  });
  return {
    calls,
    get: (params = '') =>
      GET(new Request(`http://localhost/api/admin/books${params}`)),
  };
}

test('loads only 50 copies, with a count-only query and deterministic descending order', async () => {
  const runtime = api();
  const response = await runtime.get();
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.books.length, 50);
  assert.equal(body.total, 121);
  assert.equal(body.page, 1);
  assert.equal(body.pageSize, 50);
  assert.deepEqual(
    runtime.calls.map((c) => c.method),
    ['HEAD', 'GET'],
  );
  assert.equal(runtime.calls[1].params.get('offset'), '0');
  assert.equal(runtime.calls[1].params.get('limit'), '50');
  assert.equal(runtime.calls[1].params.get('order'), 'id.desc');
});

test('second page and a removed last page use the correct bounded range', async () => {
  for (const [total, requested, page, offset, length] of [
    [121, 2, 2, 50, 50],
    [100, 3, 2, 50, 50],
    [121, 99, 3, 100, 21],
  ]) {
    const runtime = api({ total });
    const body = await (await runtime.get(`?page=${requested}`)).json();
    assert.equal(body.page, page);
    assert.equal(body.books.length, length);
    assert.equal(runtime.calls[1].params.get('offset'), String(offset));
    assert.equal(runtime.calls.length, 2);
  }
});

test('all four sorts order the full copy result in the DB before pagination, with stable ties', async () => {
  for (const [sort, order] of [
    ['latest', 'id.desc'],
    ['reg_no', 'reg_no.asc.nullslast,id.asc'],
    [
      'category',
      'books(category_code).asc.nullslast,books(author_code).asc.nullslast,reg_no.asc.nullslast,id.asc',
    ],
    ['title', 'books(title).asc.nullslast,reg_no.asc.nullslast,id.asc'],
  ]) {
    const runtime = api();
    const response = await runtime.get(
      `?sort=${sort}&page=2&q=Book&recommended=true`,
    );
    assert.equal(response.status, 200);
    const [count, rows] = runtime.calls;
    assert.equal(count.params.get('order'), null);
    assert.equal(rows.params.get('order'), order, sort);
    assert.equal(
      rows.params.get('books.order'),
      null,
      'must sort copies, not the embedded book alone',
    );
    assert.equal(rows.params.get('offset'), '50');
    assert.equal(rows.params.get('limit'), '50');
    assert.equal(rows.params.get('books.is_recommended'), 'eq.true');
    assert.ok(rows.params.has('matched_books.or'));
  }
});

test('search sends a database OR across registration number, title and author without filtering returned metadata', async () => {
  for (const input of [
    'MB005557',
    'mb005557',
    ' Mb005557 ',
    '005557',
    'First',
    ' Alice ',
    '서울',
  ]) {
    const runtime = api({ total: 1 });
    const body = await (
      await runtime.get(`?q=${encodeURIComponent(input)}`)
    ).json();
    const pattern = JSON.stringify(input.trim());
    for (const { params } of runtime.calls) {
      assert.ok(params.get('select').includes('matched_books:books()'));
      assert.equal(
        params.get('matched_books.or'),
        `(title.imatch.${pattern},author.imatch.${pattern})`,
      );
      assert.equal(
        params.get('or'),
        `(reg_no.imatch.${pattern},matched_books.not.is.null)`,
      );
      assert.equal(params.get('books.or'), null);
    }
    assert.equal(body.books[0].title, 'First book');
  }
});

test('special characters are literal search text, not filter or regex syntax', async () => {
  const text = 'A.*(B),"C"\\D%_[]';
  const runtime = api({ total: 0 });
  await runtime.get(`?q=${encodeURIComponent(text)}`);
  const quoted = runtime.calls[0].params
    .get('matched_books.or')
    .slice('(title.imatch.'.length)
    .split(',author.imatch.')[0];
  const pattern = JSON.parse(quoted);
  assert.ok(new RegExp(pattern, 'i').test(text));
  assert.ok(!new RegExp(pattern, 'i').test('AXYZB,C\\D%_'));
});

test('empty search has no filter; recommended filter runs on the database for count and rows', async () => {
  const runtime = api();
  await runtime.get('?q=%20%20&recommended=true');
  for (const { params } of runtime.calls) {
    assert.equal(params.get('or'), null);
    assert.equal(params.get('books.is_recommended'), 'eq.true');
    assert.ok(params.get('select').includes('books!inner('));
  }
});

test('empty results skip fetching rows and report page one', async () => {
  const runtime = api({ total: 0 });
  const body = await (await runtime.get('?page=3&q=missing')).json();
  assert.deepEqual(body, { books: [], total: 0, page: 1, pageSize: 50 });
  assert.equal(runtime.calls.length, 1);
});

test('category filters count and copies with an inner join alongside search and sorting', async () => {
  for (const extra of ['', '&q=MB001&recommended=true&sort=title&page=2']) {
    const runtime = api();
    assert.equal((await runtime.get(`?category=010${extra}`)).status, 200);
    for (const { params } of runtime.calls) {
      assert.equal(params.get('books.category_code'), 'eq.010');
      assert.ok(params.get('select').includes('books!inner('));
    }
    assert.equal(runtime.calls[1].params.get('limit'), '50');
  }
  const empty = api({ total: 0 });
  const result = await (await empty.get('?category=999&page=3')).json();
  assert.equal(result.total, 0);
  assert.equal(result.page, 1);
  assert.equal(empty.calls.length, 1);
});

test('invalid input and non-admin requests do not access the database', async () => {
  for (const params of [
    '?page=0',
    '?page=-1',
    '?page=1.5',
    '?page=no',
    '?page=9007199254740991',
    '?sort=',
    '?sort=unknown',
    '?sort=title.desc,id',
    '?category=01',
    '?category=010,100',
    '?category=abc',
    `?q=${'a'.repeat(201)}`,
  ]) {
    const runtime = api();
    assert.equal((await runtime.get(params)).status, 400, params);
    assert.equal(runtime.calls.length, 0);
  }
  const runtime = api({
    authError: Response.json({ error: 'Forbidden' }, { status: 403 }),
  });
  assert.equal((await runtime.get()).status, 403);
  assert.equal(runtime.calls.length, 0);
});

test('count and list errors are reported instead of an empty success', async () => {
  for (const options of [
    { dbError: 'count failed' },
    { listError: 'list failed' },
  ]) {
    const response = await api(options).get();
    assert.equal(response.status, 500);
    assert.equal(
      (await response.json()).error,
      options.dbError ?? options.listError,
    );
  }
});

function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== 'object') return [];
  return [tree, ...nodes(tree.props?.children)];
}

test('book route passes category parameters to a keyed list so clearing or changing categories resets pagination', async () => {
  const { default: Page } = load('src/app/(page)/admin/books/page.tsx', {
    '@/components/AdminBookList': { default: 'AdminBookList' },
    'react/jsx-runtime': { jsx: (type, props, key) => ({ type, props, key }) },
  });
  for (const [category, expected] of [
    ['010', '010'],
    [' 020 ', '020'],
    [['030', '040'], '030'],
    [undefined, ''],
  ]) {
    const tree = await Page({ searchParams: Promise.resolve({ category }) });
    assert.equal(tree.type, 'AdminBookList');
    assert.equal(tree.props.categoryCode, expected);
    assert.equal(tree.key, expected);
  }
});

function ui(categoryCode = '') {
  const states = [];
  const effects = [];
  const timers = new Map();
  let cursor = 0;
  let timerId = 0;
  const runtime = {
    result: {
      data: {
        books: [
          { copyId: 1, regNo: 'MB000001', title: 'Book', status: '대여가능' },
        ],
        total: 121,
        page: 1,
        pageSize: 50,
      },
    },
    retries: 0,
    calls: [],
  };
  const { default: Page } = load(
    'src/components/AdminBookList.tsx',
    {
      react: {
        useState(initial) {
          const i = cursor++;
          if (!(i in states)) states[i] = initial;
          return [
            states[i],
            (value) => {
              states[i] =
                typeof value === 'function' ? value(states[i]) : value;
            },
          ];
        },
        useEffect(callback, deps) {
          const i = cursor++;
          if (
            !effects[i] ||
            deps.some((value, index) => value !== effects[i].deps[index])
          ) {
            effects[i]?.cleanup?.();
            effects[i] = { deps, cleanup: callback() };
          }
        },
      },
      '@tanstack/react-query': {
        useQueryClient: () => ({ invalidateQueries() {} }),
        useQuery(options) {
          if (options.queryKey[0] !== 'admin-books') return { data: [] };
          runtime.query = options;
          return {
            ...runtime.result,
            refetch: () => {
              runtime.retries++;
            },
          };
        },
        useMutation: () => ({ mutate() {} }),
      },
      '@/hooks/useHorizontalWheel': {
        useHorizontalWheel: () => ({ current: null }),
      },
      '@/lib/publicationDate': {
        formatPublicationDate: (value) => value ?? '',
      },
      'react/jsx-runtime': {
        jsx: (type, props) => ({ type, props }),
        jsxs: (type, props) => ({ type, props }),
      },
    },
    {
      setTimeout: (callback) => {
        timers.set(++timerId, callback);
        return timerId;
      },
      clearTimeout: (id) => timers.delete(id),
      fetch: async (url, options) => {
        runtime.calls.push({ url, options });
        return Response.json(runtime.result.data);
      },
    },
  );
  runtime.render = () => {
    cursor = 0;
    return nodes(Page({ categoryCode }));
  };
  runtime.flush = () => {
    for (const callback of timers.values()) callback();
    timers.clear();
  };
  return runtime;
}

test('category-scoped book lists retain the filter across search, sort and pages', async () => {
  const runtime = ui('010');
  let tree = runtime.render();
  assert.ok(
    tree.some(
      (node) =>
        node.props['aria-label'] === '분류 필터 해제' &&
        node.props.href === '/admin/books',
    ),
  );
  tree
    .find(
      (node) => node.props['aria-label'] === '제목, 저자 또는 등록번호 검색',
    )
    .props.onChange({ target: { value: 'MB001' } });
  runtime.render();
  runtime.flush();
  tree = runtime.render();
  tree
    .find((node) => node.props['aria-label'] === '도서 정렬')
    .props.onChange({ target: { value: 'title' } });
  runtime
    .render()
    .find((node) => node.type === 'button' && node.props.children === '다음')
    .props.onClick();
  runtime.render();
  await runtime.query.queryFn({});
  const params = new URL(runtime.calls.at(-1).url, 'http://localhost')
    .searchParams;
  assert.equal(params.get('category'), '010');
  assert.equal(params.get('q'), 'MB001');
  assert.equal(params.get('sort'), 'title');
  assert.equal(params.get('page'), '2');
  assert.ok(runtime.query.queryKey.includes('010'));
});

test('all-books management cells stay pinned to the right without changing edit actions', () => {
  const runtime = ui();
  const tree = runtime.render();
  const header = tree.find(
    (node) => node.type === 'th' && node.props.children === '관리',
  );
  const actions = tree.find(
    (node) =>
      node.type === 'td' &&
      nodes(node).some((child) => child.props?.['aria-label'] === '수정'),
  );
  assert.ok(header);
  assert.ok(actions);
  for (const cell of [header, actions]) {
    const classes = cell.props.className.split(' ');
    for (const name of ['sticky', 'right-0', 'z-10', 'bg-white', 'min-w-24'])
      assert.ok(classes.includes(name), `${cell.type}: ${name}`);
  }
  assert.ok(
    tree.some((node) => node.props?.className?.includes('overflow-auto')),
  );
  const buttons = nodes(actions).filter((node) => node.type === 'button');
  assert.deepEqual(
    buttons.map((node) => node.props['aria-label']),
    ['수정', '삭제'],
  );
  buttons[0].props.onClick();
  assert.equal(
    runtime.render().find((node) => node.type?.name === 'EditBookForm').props
      .book.copyId,
    1,
  );
});

test('page controls use server totals and request the next 50 with an abort signal', async () => {
  const runtime = ui();
  const next = runtime
    .render()
    .find((node) => node.type === 'button' && node.props.children === '다음');
  assert.ok(
    next,
    'server total, not the length of this page, must enable pagination',
  );
  next.props.onClick();
  runtime.render();
  const signal = new AbortController().signal;
  await runtime.query.queryFn({ signal });
  const request = runtime.calls[0];
  assert.equal(
    new URL(request.url, 'http://localhost').searchParams.get('page'),
    '2',
  );
  assert.equal(request.options.signal, signal);
  assert.ok(runtime.query.queryKey.includes(2));
});

test('sort labels, query key and page reset follow the chosen order without clearing search', async () => {
  const runtime = ui();
  let tree = runtime.render();
  const select = () =>
    runtime
      .render()
      .find(
        (node) =>
          node.type === 'select' && node.props['aria-label'] === '도서 정렬',
      );
  assert.ok(select(), 'sorting control must be available');
  assert.equal(select().props.value, 'latest');
  assert.deepEqual(
    nodes(select())
      .filter((node) => node.type === 'option')
      .map((node) => [node.props.value, node.props.children]),
    [
      ['latest', '최신 등록순'],
      ['reg_no', '등록번호순'],
      ['category', '분류번호순'],
      ['title', '제목순'],
    ],
  );
  tree
    .find(
      (node) => node.props?.['aria-label'] === '제목, 저자 또는 등록번호 검색',
    )
    .props.onChange({ target: { value: 'Book' } });
  runtime.render();
  runtime.flush();
  for (const sort of ['reg_no', 'category', 'title', 'latest']) {
    tree = runtime.render();
    tree
      .find((node) => node.type === 'button' && node.props.children === '다음')
      .props.onClick();
    const oldKey = JSON.stringify(runtime.render() && runtime.query.queryKey);
    select().props.onChange({ target: { value: sort } });
    runtime.render();
    await runtime.query.queryFn({});
    const params = new URL(runtime.calls.at(-1).url, 'http://localhost')
      .searchParams;
    assert.equal(params.get('sort'), sort);
    assert.equal(params.get('page'), '1');
    assert.equal(params.get('q'), 'Book');
    assert.ok(runtime.query.queryKey.includes(sort));
    assert.notEqual(JSON.stringify(runtime.query.queryKey), oldKey);
    assert.equal(select().props.value, sort);
  }
  select().props.onChange({ target: { value: 'title' } });
  runtime
    .render()
    .find(
      (node) => node.type === 'button' && node.props.children === '추천 도서',
    )
    .props.onClick();
  runtime.render();
  await runtime.query.queryFn({});
  const params = new URL(runtime.calls.at(-1).url, 'http://localhost')
    .searchParams;
  assert.equal(params.get('sort'), 'title');
  assert.equal(params.get('recommended'), 'true');
});

test('search is debounced, resets to page one, and recommended tab has its own DB filter', async () => {
  const runtime = ui();
  let tree = runtime.render();
  tree
    .find((node) => node.type === 'button' && node.props.children === '다음')
    ?.props.onClick();
  tree = runtime.render();
  const before = JSON.stringify(runtime.query.queryKey);
  tree
    .find(
      (node) => node.props?.['aria-label'] === '제목, 저자 또는 등록번호 검색',
    )
    .props.onChange({ target: { value: ' mb005557 ' } });
  runtime.render();
  assert.equal(JSON.stringify(runtime.query.queryKey), before);
  runtime.flush();
  tree = runtime.render();
  await runtime.query.queryFn({});
  let params = new URL(runtime.calls.at(-1).url, 'http://localhost')
    .searchParams;
  assert.equal(params.get('q'), 'mb005557');
  assert.equal(params.get('page'), '1');
  tree
    .find(
      (node) => node.type === 'button' && node.props.children === '추천 도서',
    )
    .props.onClick();
  runtime.render();
  await runtime.query.queryFn({});
  params = new URL(runtime.calls.at(-1).url, 'http://localhost').searchParams;
  assert.equal(params.get('recommended'), 'true');
  assert.ok(!params.get('q'));
  assert.equal(params.get('page'), '1');
});

test('load errors are visible and retryable; corrected last page disables next', () => {
  const runtime = ui();
  runtime.result = { error: new Error('Lookup failed') };
  let tree = runtime.render();
  assert.ok(tree.some((node) => node.props?.role === 'alert'));
  tree
    .find(
      (node) => node.type === 'button' && node.props.children === '다시 시도',
    )
    .props.onClick();
  assert.equal(runtime.retries, 1);
  runtime.result = { data: { books: [], total: 100, page: 2, pageSize: 50 } };
  tree = runtime.render();
  assert.equal(
    tree.find(
      (node) => node.type === 'button' && node.props.children === '다음',
    ).props.disabled,
    true,
  );
});
