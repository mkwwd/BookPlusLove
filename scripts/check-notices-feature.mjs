import assert from 'node:assert/strict';
import fs from 'node:fs';

const header = fs.readFileSync('src/components/Header.tsx', 'utf8');
const noticesPage = fs.readFileSync('src/app/(page)/notices/page.tsx', 'utf8');
const noticeManager = fs.readFileSync(
  'src/components/NoticeManager.tsx',
  'utf8',
);
const adminNav = fs.readFileSync('src/app/(page)/admin/AdminNav.tsx', 'utf8');
const adminPage = fs.readFileSync(
  'src/app/(page)/admin/notices/page.tsx',
  'utf8',
);
const adminApi = fs.readFileSync('src/app/api/admin/notices/route.ts', 'utf8');
const adminItemApi = fs.readFileSync(
  'src/app/api/admin/notices/[noticeId]/route.ts',
  'utf8',
);
const schema = fs.readFileSync('sql/notices.sql', 'utf8');

assert.match(header, /href="\/notices"/, 'header links to the notices page');
assert.match(
  header,
  /href="https:\/\/www\.kccei\.com\/fro_end\/html\/main\/index\.php"/,
  'header links to the education center site',
);
assert.match(noticesPage, /공지사항/, 'notices page has the expected title');
assert.match(
  noticesPage,
  /등록된 공지사항이 없습니다/,
  'notices page has an empty state',
);
assert.match(
  noticesPage,
  /from\('notices'\)/,
  'public page reads notices from the database',
);
assert.match(
  noticesPage,
  /hideWhenForbidden/,
  'public page hides notice management when admin API is forbidden',
);
assert.match(
  noticeManager,
  /res\.status === 401 \|\| res\.status === 403/,
  'notice manager hides itself for non-admin visitors',
);
assert.match(
  adminNav,
  /href: '\/admin\/notices'/,
  'admin nav links to notice management',
);
assert.match(
  adminPage,
  /<NoticeManager \/>/,
  'admin page reuses the notice manager',
);
assert.match(
  noticeManager,
  /method: 'DELETE'/,
  'notice manager deletes notices',
);
assert.match(
  noticeManager,
  /router\.refresh/,
  'notice manager refreshes pages',
);
assert.match(
  adminApi,
  /export async function POST/,
  'admin API creates notices',
);
assert.match(
  adminItemApi,
  /export async function PATCH/,
  'admin item API updates notices',
);
assert.match(
  adminItemApi,
  /export async function DELETE/,
  'admin item API deletes notices',
);
assert.match(
  schema,
  /create table if not exists public\.notices/,
  'schema creates notices table',
);
