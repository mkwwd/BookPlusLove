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

test('invalid input and non-admin requests do not access the database', async () => {
  for (const params of [
    '?page=0',
    '?page=-1',
    '?page=1.5',
    '?page=no',
    '?page=9007199254740991',
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

function ui() {
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
    'src/app/(page)/admin/books/page.tsx',
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
    return nodes(Page());
  };
  runtime.flush = () => {
    for (const callback of timers.values()) callback();
    timers.clear();
  };
  return runtime;
}

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
