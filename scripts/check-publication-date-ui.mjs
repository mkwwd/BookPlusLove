import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

import ts from 'typescript';

function runtime(mutation = {}) {
  const states = [];
  let cursor = 0;
  const dependencies = {
    react: {
      useState(initial) {
        const index = cursor++;
        if (!(index in states))
          states[index] = typeof initial === 'function' ? initial() : initial;
        return [
          states[index],
          (value) => {
            states[index] =
              typeof value === 'function' ? value(states[index]) : value;
          },
        ];
      },
      useEffect() {},
    },
    '@tanstack/react-query': {
      useQuery: () => ({}),
      useMutation: () => mutation,
    },
    '@/hooks/useHorizontalWheel': {
      useHorizontalWheel: () => ({ current: null }),
    },
    'react/jsx-runtime': {
      jsx: (type, props) => ({ type, props }),
      jsxs: (type, props) => ({ type, props }),
    },
  };
  function load(file, extra = '') {
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
        crypto: { randomUUID: () => 'draft-id' },
        require: (name) =>
          dependencies[name] ??
          (name.startsWith('@/lib/') ? load(`src/${name.slice(2)}.ts`) : {}),
      },
    );
    return exports;
  }
  return {
    load,
    render(component, props) {
      cursor = 0;
      return nodes(component(props));
    },
  };
}

function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== 'object') return [];
  return [tree, ...nodes(tree.props?.children)];
}

const entryFile = 'src/app/(page)/admin/books/new/page.tsx';
const book = {
  id: '1',
  copyId: 1,
  regNo: 'MB000001',
  title: 'Book',
  isbn: '',
  pubDate: '2000년 8월 8일',
  status: '대여가능',
};

test('a pending ISBN lookup can be released without changing the draft list', () => {
  let reset = false;
  const ui = runtime({
    isPending: true,
    variables: { bookId: book.id },
    reset: () => {
      reset = true;
    },
  });
  const { ScannedBookTable } = ui.load(
    entryFile,
    '\nexport { ScannedBookTable };',
  );
  const tree = ui.render(ScannedBookTable, {
    books: [book],
    categories: [],
    onUpdate: () => assert.fail('must not edit drafts'),
    onRemove: () => assert.fail('must not remove drafts'),
  });
  const cancel = tree.find(
    (node) => node.type === 'button' && node.props.children === '조회 취소',
  );
  assert.ok(cancel);
  cancel.props.onClick();
  assert.equal(reset, true);
});

test('Excel imports use ISO dates and the table blur keeps partial and malformed dates visible', () => {
  const ui = runtime();
  const { rowToScannedBook, ScannedBookTable } = ui.load(
    entryFile,
    '\nexport { rowToScannedBook, ScannedBookTable };',
  );
  const imported = rowToScannedBook(
    ['1', 'Book', '', '', '', '', 'Author', '', '2000년 8월 8일'],
    [],
  );
  assert.equal(imported.pubDate, '2000-08-08');
  for (const [value, expected] of [
    ['2000년 8월', '2000-08'],
    ['2000년', '2000'],
    ['19946-10-20', '19946-10-20'],
  ]) {
    let update;
    const tree = ui.render(ScannedBookTable, {
      books: [{ ...book, pubDate: value }],
      categories: [],
      onRemove() {},
      onUpdate: (_, patch) => {
        update = patch;
      },
    });
    const input = tree.find(
      (node) =>
        node.type === 'input' && node.props.placeholder === '예: 2017-03-31',
    );
    assert.ok(input);
    input.props.onBlur();
    assert.equal(update.pubDate, expected);
  }
});

test('manual entry and edit form use ISO placeholders, initialization and blur', () => {
  const ui = runtime();
  const Manual = ui.load(
    'src/app/(page)/admin/books/new/ManualBookEntryForm.tsx',
  ).default;
  const props = { categories: [], onSubmit() {} };
  let input = ui
    .render(Manual, props)
    .find((node) => node.props.placeholder === '예: 2017-03-31');
  assert.ok(input);
  input.props.onChange({ target: { value: '2000년 8월 8일' } });
  input = ui
    .render(Manual, props)
    .find((node) => node.props.placeholder === '예: 2017-03-31');
  input.props.onBlur();
  assert.equal(
    ui
      .render(Manual, props)
      .find((node) => node.props.placeholder === '예: 2017-03-31').props.value,
    '2000-08-08',
  );

  const edit = runtime();
  const { EditBookForm } = edit.load(
    'src/app/(page)/admin/books/page.tsx',
    '\nexport { EditBookForm };',
  );
  const tree = edit.render(EditBookForm, {
    book,
    categories: [],
    onSaved() {},
    onDelete() {},
    isDeleting: false,
  });
  assert.equal(
    tree.find((node) => node.props.placeholder === '예: 2017-03-31')?.props
      .value,
    '2000-08-08',
  );
});

test('ISBN comparison shows both providers and current date in ISO format', () => {
  const ui = runtime();
  const Compare = ui.load('src/components/IsbnCompareModal.tsx').default;
  const tree = ui.render(Compare, {
    fields: ['pubDate'],
    result: {
      aladin: { pubDate: '1983년 5월 1일' },
      nationalLibrary: { pubDate: '1996-1-1' },
    },
    currentValues: { pubDate: '1994년 4월' },
    onApply() {},
    onClose() {},
  });
  const text = tree
    .map((node) => node.props.children)
    .filter((value) => typeof value === 'string');
  for (const value of ['1983-05-01', '1996-01-01', '1994-04'])
    assert.ok(text.includes(value), value);
  assert.ok(!text.some((value) => /\d년/.test(value)));
});

test('only the public book detail uses Korean publication dates', () => {
  const detail = fs.readFileSync('src/app/(page)/books/[id]/page.tsx', 'utf8');
  assert.match(detail, /formatKoreanPublicationDate\(book.pubDate\)/);
  const ui = runtime();
  const { BookSearchResultRow } = ui.load(
    'src/components/BookSearchResultRow.tsx',
  );
  const tree = ui.render(BookSearchResultRow, {
    book: { ...book, copies: [] },
  });
  assert.ok(tree.some((node) => node.props.children === '2000-08-08'));
});
