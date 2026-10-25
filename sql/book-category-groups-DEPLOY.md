# Category hierarchy deployment

The local application and production share a database. Do not execute all SQL
files together. No production SQL has been executed by these tests.

## Before deployment

1. Back up the database, including `book_categories` and `books`, and confirm the
   target Supabase project. Review any custom dependencies on `main_label`.
2. Pause category-code administration in old clients during the transition.
   Ordinary book lookup/registration can continue with existing categories.
3. Run the **entire current `book-category-groups.sql` only**, as the database
   owner in the SQL Editor. Do not use the earlier version from commit `0370d0b`:
   that version removed `main_label` immediately.
4. Confirm success and verify the current production book list, details and
   registration. On an error, run `ROLLBACK;` if the SQL session remains in an
   aborted transaction, and investigate before retrying. Do not skip statements.

Expansion creates/seeds the parent table, keeps existing category codes and book
references, and retains `main_label`. Temporary invoker-rights triggers copy parent
labels into this legacy column on child insert/update and parent rename. Parents
are authoritative: old writes cannot rename a parent by changing `main_label`.
Unknown parent codes are rejected; create parents through the new application.
Expansion can be rerun before cleanup, but not after it.

While compatibility is active, both catalog tables serialize writes using the
same transaction advisory lock before row locks are taken. Book reads are not
serialized. The temporary lock triggers are removed during cleanup. Manual SQL
must not pre-lock catalog rows before taking this lock; use the admin endpoints.

The transaction briefly takes table locks. A five-second lock timeout aborts it
instead of waiting indefinitely; use a quiet period and retry after investigating
contention. Missing/conflicting existing labels abort the whole transaction.

## Deploy and verify

1. Review/merge the admin feature into the current main branch, retaining other
   main changes, then deploy. Do not replace main with the older admin baseline.
2. Verify existing book reads, new book registration, empty parent creation,
   subcategory creation, parent rename, subcategory move and protected deletions.
3. Check that both the parent label and legacy label match after changes:

```sql
select c.code, c.main_code, c.main_label, g.label as parent_label
from public.book_categories c
left join public.book_category_groups g on g.code = c.main_code
where g.code is null or c.main_label is distinct from g.label;
```

This should return no rows. Before cleanup, reverting the application deployment
is supported without undoing expansion; leave the column, table and triggers in
place. Keep legacy category administration paused on the reverted version.

## Optional later cleanup

Leave `book-category-groups-cleanup.sql` unexecuted until the new production code
is verified, old clients/jobs are retired and the rollback window is closed.
Keeping the compatibility column and triggers is supported; there is no deadline.

Only then change `app.category_cleanup_confirmed` from `no` to `yes` in that
script and execute it in full, during a quiet period. It checks synchronization,
removes temporary triggers/functions and drops `main_label` without `CASCADE`.
Old application code will no longer work after this step. Do not rerun expansion
as a rollback; recovery would need a separate, reviewed migration or backup.

## Isolated SQL checks

PGlite runs these checks in memory, not against Supabase. Install the test-only
runtime outside this project's dependencies, then run from the repository root:

```powershell
npm install --prefix "$env:TEMP/bookpluslove-sql-tests" --no-save --no-package-lock --ignore-scripts @electric-sql/pglite@0.5.11
node scripts/check-category-migration.mjs "$env:TEMP/bookpluslove-sql-tests/node_modules/@electric-sql/pglite/dist/index.js"
node scripts/check-admin-catalog.mjs
```

These checks cover a representative legacy schema, including trigger timing and
advisory lock acquisition, not production-specific triggers, policies or data.
PGlite is single-connection, so concurrent-session behavior is not exercised.
Production verification is still required. The statement-trigger ordering follows
the [PostgreSQL trigger documentation](https://www.postgresql.org/docs/current/trigger-definition.html).
