import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';

import ts from 'typescript';
import XLSX from 'xlsx';

export const dateCases = [
  [null, null],
  [undefined, null],
  ['', null],
  ['   ', null],
  ['2000', '2000'],
  ['2000년', '2000'],
  ['2000-8', '2000-08'],
  ['2000년 8월', '2000-08'],
  ['2000-08-08', '2000-08-08'],
  [' 2000년  8월 8일 ', '2000-08-08'],
  ['2000.8.8.', '2000-08-08'],
  ['2000/8/8', '2000-08-08'],
  ['20000808', '2000-08-08'],
  ['200008', '2000-08'],
  ['2000-02-29', '2000-02-29'],
  ['2024-02-29', '2024-02-29'],
  ['0099-01-01', '0099-01-01'],
  ['1900-02-29', undefined],
  ['2023-02-29', undefined],
  ['2000-04-31', undefined],
  ['2000-00-01', undefined],
  ['2000-01-00', undefined],
  ['2000-13', undefined],
  ['0000', undefined],
  ['19906-03-30', undefined],
  ['1993-063-25', undefined],
  ['1992-10-208', undefined],
  ['3/4/25', undefined],
  ['unknown', undefined],
  [20200101, undefined],
];

function load(file, overrides = {}, globals = {}) {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    {
      exports,
      Response,
      URL,
      require(name) {
        if (name in overrides) return overrides[name];
        const resolved = name.startsWith('@/')
          ? `src/${name.slice(2)}`
          : path.posix.join(path.posix.dirname(file), name);
        return load(`${resolved}.ts`, overrides, globals);
      },
      ...globals,
    },
  );
  return exports;
}

test('publication dates preserve precision and validate the calendar', () => {
  assert.ok(
    fs.existsSync('src/lib/publicationDate.ts'),
    'Shared publication date parser must exist',
  );
  const { normalizePublicationDate } = load('src/lib/publicationDate.ts');
  for (const [input, expected] of dateCases) {
    assert.equal(normalizePublicationDate(input), expected, String(input));
  }
});

test('Korean display pads known components and does not hide uncertain values', () => {
  assert.ok(fs.existsSync('src/lib/publicationDate.ts'));
  const { formatPublicationDate } = load('src/lib/publicationDate.ts');
  for (const [input, expected] of [
    ['2000-08-08', '2000년 08월 08일'],
    ['2000-08', '2000년 08월'],
    ['2000', '2000년'],
    ['2000년 8월 8일', '2000년 08월 08일'],
    [null, ''],
    [' 19906-03-30 ', ' 19906-03-30 '],
    ['19906-03-30', '19906-03-30'],
  ])
    assert.equal(formatPublicationDate(input), expected);
});

test('ISBN providers return canonical dates and fall back from invalid publication dates', async () => {
  const { GET } = load(
    'src/app/api/books/isbn/route.ts',
    {},
    {
      process: { env: { ALADIN_TTB_KEY: 'test', NL_SEOJI_API_KEY: 'test' } },
      fetch: async (url) =>
        url.hostname === 'www.aladin.co.kr'
          ? {
              ok: true,
              text: async () =>
                JSON.stringify({
                  item: [{ title: 'Book', pubDate: '2000-08-08' }],
                }),
            }
          : {
              ok: true,
              json: async () => ({
                docs: [
                  {
                    TITLE: 'Book',
                    PUBLISH_PREDATE: '20000230',
                    REAL_PUBLISH_DATE: '200008',
                  },
                ],
              }),
            },
    },
  );
  const response = await GET({
    url: 'https://example.test/api/books/isbn?isbn=9781234567897',
  });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.aladin.pubDate, '2000-08-08');
  assert.equal(data.nationalLibrary.pubDate, '2000-08');
});

function routeFixture(existingDate = null) {
  const writes = [];
  const server = {
    from(table) {
      let operation;
      const query = new Proxy(
        {},
        {
          get(_, method) {
            if (method === 'then')
              return (resolve, reject) =>
                Promise.resolve({
                  data: operation
                    ? table === 'books'
                      ? { id: 2 }
                      : null
                    : {
                        id: 1,
                        book_id: 2,
                        books: { cover_url: null, pub_date: existingDate },
                      },
                  error: null,
                }).then(resolve, reject);
            return (...args) => {
              if (method === 'insert' || method === 'update') {
                operation = method;
                writes.push({ table, operation, values: args[0] });
              }
              return query;
            };
          },
        },
      );
      return query;
    },
  };
  const overrides = {
    '@/utils/supabase/server': { supabaseServer: server },
    '@/utils/supabase/admin': { requireAdmin: async () => ({ error: null }) },
    '@/utils/supabase/bookCover': {
      withBookCoverCleanup: async (_, response) => response,
    },
  };
  return {
    writes,
    post: load('src/app/api/admin/books/route.ts', overrides).POST,
    patch: load('src/app/api/admin/books/[copyId]/route.ts', overrides).PATCH,
  };
}
const book = { title: 'Book', regNo: 'MB000001', status: '대여가능' };

for (const method of ['post', 'patch']) {
  test(`${method}: saves normalized dates and rejects invalid new values before writes`, async () => {
    for (const [input, expected] of [
      ['2000년 8월', '2000-08'],
      ['2000년', '2000'],
      ['', null],
      ['2023-02-29', undefined],
    ]) {
      const fixture = routeFixture();
      const payload = { ...book, pubDate: input };
      const response =
        method === 'post'
          ? await fixture.post({ json: async () => ({ books: [payload] }) })
          : await fixture.patch(
              { json: async () => payload },
              { params: Promise.resolve({ copyId: '1' }) },
            );
      assert.equal(response.status, expected === undefined ? 400 : 200);
      if (expected === undefined) assert.equal(fixture.writes.length, 0);
      else
        assert.equal(
          fixture.writes.find((w) => w.table === 'books').values.pub_date,
          expected,
        );
    }
  });
}

test('PATCH preserves omitted and unchanged malformed legacy dates but permits correction', async () => {
  for (const [fields, expected] of [
    [{}, '19906-03-30'],
    [{ pubDate: '19906-03-30' }, '19906-03-30'],
    [{ pubDate: '1990-03-30' }, '1990-03-30'],
    [{ pubDate: null }, null],
  ]) {
    const fixture = routeFixture('19906-03-30');
    const response = await fixture.patch(
      { json: async () => ({ ...book, ...fields }) },
      { params: Promise.resolve({ copyId: '1' }) },
    );
    assert.equal(response.status, 200);
    assert.equal(
      fixture.writes.find((w) => w.table === 'books').values.pub_date,
      expected,
    );
  }
});

test('Excel date cells use actual years and both workbook date systems; ambiguous text stays visible', () => {
  const file = 'src/app/(page)/admin/books/new/page.tsx';
  const source = fs.readFileSync(file, 'utf8');
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const readRows = ast.statements.find(
    (node) =>
      ts.isFunctionDeclaration(node) && node.name?.text === 'readExcelRows',
  );
  assert.ok(
    readRows,
    'Excel dates must not rely on a two-digit-year heuristic',
  );
  const context = { XLSX, ...load('src/lib/publicationDate.ts') };
  const parse = vm.runInNewContext(
    ts.transpileModule(readRows.getText(ast), {}).outputText +
      '\nreadExcelRows',
    context,
  );
  for (const date1904 of [false, true]) {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ['MB000001', 'Book', '', '', '', '', '', '', 1],
      ['MB000002', 'Book', '', '', '', '', '', '', '3/4/25'],
      ['MB000003', 'Book', '', '', '', '', '', '', '2000년'],
    ]);
    sheet.I1.z = 'm/d/yy';
    workbook.Workbook = { WBProps: { date1904 } };
    XLSX.utils.book_append_sheet(workbook, sheet, 'Books');
    const rows = parse(
      XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }),
    );
    assert.equal(rows[0][8], date1904 ? '1904-01-02' : '1900-01-01');
    assert.equal(rows[1][8], '3/4/25');
    assert.equal(rows[2][8], '2000년');
  }
  for (const [serial, format] of [
    [-1, 'yyyy-mm-dd'],
    [60, 'yyyy-mm'],
    [1, 'hh:mm'],
    [1, '[h]:mm'],
    [1, 'hh:mm "day"'],
    [1, 'hh:mm;yyyy-mm-dd'],
    [1, '[>=2]yyyy-mm-dd;hh:mm'],
  ]) {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ['MB000001', 'Book', '', '', '', '', '', '', serial],
    ]);
    sheet.I1.z = format;
    XLSX.utils.book_append_sheet(workbook, sheet, 'Books');
    const value = parse(
      XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }),
    )[0][8];
    assert.equal(
      context.normalizePublicationDate(value),
      undefined,
      `${serial}: ${format}`,
    );
    assert.ok(
      value.length > 0,
      'Invalid Excel dates must not silently become empty',
    );
  }
});
