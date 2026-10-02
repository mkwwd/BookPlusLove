import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

import ts from 'typescript';

const directory = 'src/app/(page)/admin/books/new/';
function load(file, dependencies, extra = '') {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8') + extra, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, {
    exports, Response, crypto: { randomUUID: () => 'draft-id' },
    require: (name) => dependencies[name] ?? {},
  });
  return exports;
}

function componentRuntime() {
  const states = [];
  let cursor = 0;
  const dependencies = {
    react: {
      useState(initial) {
        const index = cursor++;
        if (!(index in states)) states[index] = initial;
        return [states[index], (value) => { states[index] = value; }];
      },
      useEffect() {},
    },
    '@tanstack/react-query': { useQuery: () => ({}), useMutation: () => ({}) },
    '@/hooks/useHorizontalWheel': { useHorizontalWheel: () => ({ current: null }) },
    '@/lib/authorCode': { generateAuthorCode: () => 'A1' },
    '@/lib/regNo': { isValidRegNo: () => true },
    'react/jsx-runtime': {
      jsx: (type, props) => ({ type, props }),
      jsxs: (type, props) => ({ type, props }),
    },
  };
  return { dependencies, render(component, props) { cursor = 0; return component(props); } };
}

function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== 'object') return [];
  return [tree, ...nodes(tree.props?.children)];
}

test('manual description is editable, submitted and reset', () => {
  const runtime = componentRuntime();
  const component = load(`${directory}ManualBookEntryForm.tsx`, runtime.dependencies).default;
  let submitted;
  const props = { categories: [], initialRegNo: 'MB000001', onSubmit: (book) => { submitted = book; } };
  let tree = nodes(runtime.render(component, props));
  const description = tree.find((node) => node.type === 'textarea' && node.props.id === 'manual-description');
  assert.ok(description, 'manual entry needs a description textarea');
  description.props.onChange({ target: { value: 'First line\nSecond line' } });
  tree.find((node) => node.props.placeholder === '도서 제목을 입력해주세요').props.onChange({ target: { value: 'Book' } });
  tree = nodes(runtime.render(component, props));
  tree.find((node) => node.type === 'button' && node.props.children === '목록에 추가').props.onClick();
  assert.equal(submitted.description, 'First line\nSecond line');
  assert.equal(nodes(runtime.render(component, props)).find((node) => node.props.id === 'manual-description').props.value, '');
});

test('Excel description is an optional thirteenth column; old rows still work', () => {
  const runtime = componentRuntime();
  const { rowToScannedBook } = load(`${directory}page.tsx`, runtime.dependencies, '\nexport { rowToScannedBook };');
  const row = ['1', 'Book', '', '', '', '', 'Author', 'Publisher', '', '', '', 'Donor'];
  assert.equal(rowToScannedBook(row, []).description, undefined);
  const book = rowToScannedBook([...row, '  First line\nSecond line  '], []);
  assert.equal(book.description, 'First line\nSecond line');
  assert.equal(book.donorName, 'Donor');
});

test('registration table edits the description without changing other fields', () => {
  const runtime = componentRuntime();
  const { ScannedBookTable } = load(`${directory}page.tsx`, runtime.dependencies, '\nexport { ScannedBookTable };');
  let update;
  const tree = nodes(runtime.render(ScannedBookTable, {
    books: [{ id: '1', regNo: 'MB000001', title: 'Book', isbn: '', description: 'Imported' }],
    categories: [], onRemove() {}, onUpdate: (id, patch) => { update = { id, ...patch }; }, emptyText: 'empty',
  }));
  const textarea = tree.find((node) => node.type === 'textarea');
  assert.ok(textarea, 'registration table needs a description textarea');
  assert.equal(textarea.props.value, 'Imported');
  textarea.props.onChange({ target: { value: 'Edited\nsummary' } });
  assert.deepEqual(update, { id: '1', description: 'Edited\nsummary' });
  assert.equal(tree.filter((node) => node.type === 'th').length, tree.filter((node) => node.type === 'td').length);
});

test('registration API writes the description to books', async () => {
  let saved;
  const { POST } = load('src/app/api/admin/books/route.ts', {
    '@/utils/supabase/admin': { requireAdmin: async () => ({ error: null }) },
    '@/utils/supabase/bookCover': { withBookCoverCleanup: (_, response) => response },
    '@/lib/regNo': { isValidRegNo: () => true },
    '@/utils/supabase/server': { supabaseServer: { from: (table) => ({
      insert(value) {
        if (table !== 'books') return Promise.resolve({ error: null });
        saved = value;
        return { select: () => ({ single: async () => ({ data: { id: 1 }, error: null }) }) };
      },
    }) } },
  });
  const response = await POST({ json: async () => ({ books: [{ title: 'Book', regNo: 'MB000001', description: 'Saved\nsummary' }] }) });
  assert.equal(response.status, 200);
  assert.equal(saved.description, 'Saved\nsummary');
});
