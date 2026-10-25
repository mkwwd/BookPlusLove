import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

import ts from 'typescript';

function loadDrafts(entries, response) {
  let mutation;
  let stateIndex = 0;
  const states = [];
  const progressUpdates = [];
  let current = entries;
  const revoked = [];
  const calls = [];
  let tableProps;
  const mutationState = {};
  const source = fs.readFileSync(
    'src/app/(page)/admin/books/new/page.tsx',
    'utf8',
  );
  const dependencies = {
    react: {
      useRef: () => ({ current: null }),
      useEffect: () => {},
      useState(initial) {
        const index = stateIndex++;
        if (!(index in states)) states[index] = index === 2 ? current : initial;
        return [
          states[index],
          (value) => {
            states[index] =
              typeof value === 'function' ? value(states[index]) : value;
            if (index === 2) current = states[index];
            if (states[index]?.processed !== undefined)
              progressUpdates.push({ ...states[index] });
          },
        ];
      },
    },
    '@tanstack/react-query': {
      useQuery: () => ({ data: [] }),
      useMutation: (options) => {
        mutation = options;
        return mutationState;
      },
    },
    'next/navigation': { useSearchParams: () => ({ get: () => null }) },
    '@/lib/regNo': { isValidRegNo: () => true },
    'react/jsx-runtime': {
      jsx(type, props) {
        if (type?.name === 'ScannedBookTable') tableProps = props;
        if (type?.name === 'RegistrationProgressDialog') return type(props);
        return { type, props };
      },
      jsxs: (type, props) => ({ type, props }),
    },
  };
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(`${source}\nexport { BookRegisterContent };`, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText,
    {
      exports,
      require: (name) => dependencies[name] ?? {},
      URL: { revokeObjectURL: (url) => revoked.push(url) },
      FormData: class {
        append() {}
      },
      fetch: async (url, options) => {
        calls.push({ url, options });
        if (typeof response === 'function') return response(url, options);
        return url.endsWith('/cover')
          ? {
              ok: true,
              json: async () => ({ url: 'https://storage/uploaded.jpg' }),
            }
          : response;
      },
    },
  );
  const render = () => {
    stateIndex = 0;
    return exports.BookRegisterContent();
  };
  render();
  return {
    mutation,
    revoked,
    calls,
    tableProps,
    progressUpdates,
    render,
    mutationState,
    current: () => current,
  };
}

const books = [
  { id: '1', title: 'A', regNo: 'MB000001', coverUrl: 'blob:a', coverFile: {} },
  { id: '2', title: 'B', regNo: 'MB000002', coverUrl: 'blob:b', coverFile: {} },
];

test('partial registration keeps original failed draft file and preview for retry', async () => {
  const draft = loadDrafts(books, {
    ok: true,
    json: async () => ({
      registered: 1,
      failed: [{ regNo: 'MB000002', error: 'duplicate' }],
      coverWarnings: ['cleanup failed'],
    }),
  });
  const result = await draft.mutation.mutationFn(books);
  assert.deepEqual(draft.revoked, ['blob:a']);
  draft.mutation.onSuccess(result, books);
  assert.equal(draft.current().length, 1);
  assert.equal(draft.current()[0], books[1]);
  assert.deepEqual(draft.revoked, ['blob:a']);
  assert.equal(result.coverWarnings[0], 'cleanup failed');
});

test('failed request keeps files and previews while displaying cleanup warning', async () => {
  const draft = loadDrafts(books, {
    ok: false,
    json: async () => ({
      error: 'save failed',
      coverWarnings: ['cleanup failed'],
    }),
  });
  await assert.rejects(
    draft.mutation.mutationFn(books),
    /save failed\ncleanup failed/,
  );
  assert.equal(draft.current(), books);
  assert.deepEqual(draft.revoked, []);
});

test('choosing an API cover after a file clears the pending upload and releases the preview', async () => {
  const draft = loadDrafts(books, {
    ok: true,
    json: async () => ({ registered: 1, failed: [] }),
  });
  draft.tableProps.onUpdate('1', { coverUrl: 'https://api.example/cover.jpg' });
  assert.equal(draft.current()[0].coverFile, undefined);
  assert.deepEqual(draft.revoked, ['blob:a']);
  await draft.mutation.mutationFn([draft.current()[0]]);
  assert.equal(draft.calls.length, 1);
  assert.equal(draft.calls[0].url, '/api/admin/books');
  assert.equal(
    JSON.parse(draft.calls[0].options.body).books[0].coverUrl,
    'https://api.example/cover.jpg',
  );
});

test('replacing a file keeps the new file; unrelated edits keep the selected cover', () => {
  const draft = loadDrafts(books, {});
  const file = { name: 'new.jpg' };
  draft.tableProps.onUpdate('1', { coverUrl: 'blob:new', coverFile: file });
  draft.tableProps.onUpdate('1', { title: 'Edited' });
  assert.equal(draft.current()[0].coverFile, file);
  assert.equal(draft.current()[0].coverUrl, 'blob:new');
  assert.deepEqual(draft.revoked, ['blob:a']);
});

test('removing a selected cover clears its file before registration', () => {
  const draft = loadDrafts(books, {});
  draft.tableProps.onUpdate('1', { coverUrl: '' });
  assert.equal(draft.current()[0].coverFile, undefined);
  assert.equal(draft.current()[0].coverUrl, '');
  assert.deepEqual(draft.revoked, ['blob:a']);
});

test('multiple local files are uploaded individually before registering the batch', async () => {
  const draft = loadDrafts(books, {
    ok: true,
    json: async () => ({ registered: 2, failed: [] }),
  });
  await draft.mutation.mutationFn(books);
  assert.deepEqual(
    draft.calls.map(({ url }) => url),
    ['/api/admin/books/cover', '/api/admin/books/cover', '/api/admin/books'],
  );
  assert.ok(
    JSON.parse(draft.calls[2].options.body).books.every(
      (book) => book.coverUrl === 'https://storage/uploaded.jpg',
    ),
  );
});

const responseFor = (registered, failed = []) => ({
  ok: true,
  json: async () => ({ registered, failed }),
});
const manyBooks = (count) =>
  Array.from({ length: count }, (_, index) => ({
    id: String(index + 1),
    title: `Book ${index + 1}`,
    regNo: `MB${String(index + 1).padStart(6, '0')}`,
    coverUrl: 'https://api.example/cover.jpg',
  }));

test('45 books register sequentially in 20/20/5 batches with confirmed progress', async () => {
  const entries = manyBooks(45);
  const batches = [];
  const draft = loadDrafts(entries, async (url, options) => {
    assert.equal(url, '/api/admin/books');
    const batch = JSON.parse(options.body).books;
    batches.push(batch.length);
    assert.equal(
      draft.progressUpdates.at(-1).processed,
      batches.length === 1 ? 0 : (batches.length - 1) * 20,
    );
    assert.equal(draft.current().length, 45 - (batches.length - 1) * 20);
    return responseFor(batch.length);
  });
  const result = await draft.mutation.mutationFn(entries);
  assert.deepEqual(batches, [20, 20, 5]);
  assert.equal(result.registered, 45);
  assert.equal(draft.current().length, 0);
  assert.deepEqual(
    [...new Set(draft.progressUpdates.map((p) => p.processed))],
    [0, 20, 40, 45],
  );
  const progress = draft.progressUpdates.at(-1);
  assert.equal(progress.total, 45);
  assert.equal(progress.registered, 45);
  assert.equal(progress.failed, 0);
});

test('partial failures count as processed, but keep the failed draft and its original file', async () => {
  const entries = manyBooks(21);
  entries[0] = {
    ...entries[0],
    regNo: ' MB000001 ',
    coverUrl: 'blob:first',
    coverFile: {},
  };
  let batchIndex = 0;
  const draft = loadDrafts(entries, async (url) => {
    if (url.endsWith('/cover'))
      return {
        ok: true,
        json: async () => ({ url: 'https://storage/first.jpg' }),
      };
    return batchIndex++ === 0
      ? responseFor(19, [
          { title: entries[0].title, regNo: ' MB000001 ', error: 'duplicate' },
        ])
      : responseFor(1);
  });
  const result = await draft.mutation.mutationFn(entries);
  assert.equal(result.registered, 20);
  assert.equal(result.failed.length, 1);
  assert.equal(draft.current().length, 1);
  assert.equal(draft.current()[0], entries[0]);
  assert.deepEqual(draft.revoked, []);
  assert.equal(draft.progressUpdates.at(-1).processed, 21);
  assert.equal(draft.progressUpdates.at(-1).failed, 1);
});

test('interrupted second batch preserves confirmed saves and leaves unsent covers untouched', async () => {
  const entries = manyBooks(45).map((book) => ({
    ...book,
    coverUrl: `blob:${book.id}`,
    coverFile: {},
  }));
  let batchIndex = 0;
  let uploads = 0;
  const draft = loadDrafts(entries, async (url) => {
    if (url.endsWith('/cover')) {
      uploads++;
      return {
        ok: true,
        json: async () => ({ url: `https://storage/${uploads}.jpg` }),
      };
    }
    if (batchIndex++ === 0) return responseFor(20);
    throw new Error('network lost');
  });
  await assert.rejects(draft.mutation.mutationFn(entries), /저장 여부/);
  assert.equal(uploads, 40);
  assert.equal(draft.current().length, 25);
  assert.equal(draft.current()[0], entries[20]);
  assert.equal(draft.revoked.length, 20);
  assert.equal(draft.progressUpdates.at(-1).processed, 20);
  assert.equal(draft.progressUpdates.at(-1).coversProcessed, 40);
  assert.equal(draft.progressUpdates.at(-1).coversTotal, 45);
  assert.equal(draft.mutation.retry, false);
});

test('upload failure is counted without falsely claiming the file was uploaded', async () => {
  const draft = loadDrafts(books, async (url) =>
    url.endsWith('/cover')
      ? { ok: false, json: async () => ({ error: 'upload failed' }) }
      : responseFor(2),
  );
  const result = await draft.mutation.mutationFn(books);
  assert.equal(result.coverWarnings.length, 2);
  assert.equal(draft.progressUpdates.at(-1).coversProcessed, 2);
  assert.equal(draft.progressUpdates.at(-1).coversFailed, 2);
  assert.equal(draft.progressUpdates.at(-1).processed, 2);
});

test('a malformed success response never advances progress or discards drafts', async () => {
  const entries = manyBooks(21);
  const draft = loadDrafts(entries, responseFor(0));
  await assert.rejects(draft.mutation.mutationFn(entries), /저장 여부/);
  assert.equal(draft.current(), entries);
  assert.equal(draft.progressUpdates.at(-1).processed, 0);
  assert.equal(draft.calls.length, 1);
});

test('the rendered native progress bar exposes the confirmed count and total', async () => {
  const entries = manyBooks(3);
  const draft = loadDrafts(entries, responseFor(3));
  await draft.mutation.mutationFn(entries);
  const nodes = [];
  const visit = (node) => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!node?.props) return;
    nodes.push(node);
    visit(node.props.children);
  };
  visit(draft.render());
  const progress = nodes.find(
    (node) =>
      node.type === 'progress' &&
      node.props['aria-label'] === '도서 등록 진행률',
  );
  assert.ok(progress);
  assert.equal(progress.props.value, 3);
  assert.equal(progress.props.max, 3);
});

function renderedNodes(tree) {
  const nodes = [];
  const visit = (node) => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!node?.props) return;
    nodes.push(node);
    visit(node.props.children);
  };
  visit(tree);
  return nodes;
}

test('pending registration opens a dialog outside the disabled fieldset and cannot be dismissed', async () => {
  const entries = manyBooks(1);
  const draft = loadDrafts(entries, responseFor(1));
  await draft.mutation.mutationFn(entries);
  draft.mutationState.isPending = true;
  const nodes = renderedNodes(draft.render());
  const dialog = nodes.find((node) => node.type === 'dialog');
  assert.ok(dialog, 'progress must be displayed in a modal dialog');
  assert.ok(dialog.props['aria-labelledby']);
  assert.equal(
    renderedNodes(nodes.find((node) => node.type === 'fieldset')).some(
      (node) => node.type === 'dialog',
    ),
    false,
  );
  assert.equal(
    renderedNodes(dialog).some((node) => node.type === 'button'),
    false,
  );
  let prevented = false;
  dialog.props.onCancel({
    preventDefault() {
      prevented = true;
    },
  });
  assert.equal(prevented, true);
  assert.ok(
    renderedNodes(draft.render()).find((node) => node.type === 'dialog'),
  );
});

test('completed registration stays visible until confirm, then can open again', async () => {
  const entries = manyBooks(2);
  const draft = loadDrafts(entries, responseFor(2));
  const result = await draft.mutation.mutationFn(entries);
  draft.mutation.onSuccess(result);
  const dialog = renderedNodes(draft.render()).find(
    (node) => node.type === 'dialog',
  );
  assert.ok(dialog);
  const confirm = renderedNodes(dialog).find(
    (node) => node.type === 'button' && node.props.children === '확인',
  );
  assert.ok(confirm);
  confirm.props.onClick();
  assert.equal(
    renderedNodes(draft.render()).some(
      (node) => node.type === 'dialog' || node.type === 'progress',
    ),
    false,
  );
  await draft.mutation.mutationFn(entries);
  assert.ok(
    renderedNodes(draft.render()).find((node) => node.type === 'dialog'),
  );
});

test('interrupted registration shows the error inside the dialog and confirm retains drafts', async () => {
  const entries = manyBooks(1);
  const draft = loadDrafts(entries, {
    ok: false,
    json: async () => ({ error: 'save failed' }),
  });
  let failure;
  try {
    await draft.mutation.mutationFn(entries);
  } catch (error) {
    failure = error;
  }
  assert.ok(failure);
  draft.mutationState.error = failure;
  draft.mutation.onError(failure);
  const dialog = renderedNodes(draft.render()).find(
    (node) => node.type === 'dialog',
  );
  assert.ok(dialog);
  assert.ok(
    renderedNodes(dialog).some(
      (node) =>
        node.props.role === 'alert' && node.props.children === failure.message,
    ),
  );
  renderedNodes(dialog)
    .find((node) => node.type === 'button')
    .props.onClick();
  assert.equal(
    renderedNodes(draft.render()).some((node) => node.type === 'dialog'),
    false,
  );
  assert.equal(draft.current(), entries);
});
