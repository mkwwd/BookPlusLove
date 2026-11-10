# Category Colors Implementation Plan

**Goal:** Show major book categories as colored cards and let administrators edit their colors.

**Architecture:** Store one optional API color on `book_category_groups`, with a six-digit opaque HEX value in PostgreSQL. Keep existing subcategory navigation, parish screens, permissions and deletion safeguards. Use the requested palette as the initial values and a read fallback before migration. Prepare additive SQL; do not execute it against the shared database.

**Tech Stack:** Existing Next.js, React Query, Supabase, Tailwind and native color input.

**Spec:** User-provided dashboard reference and colors: 000 #FFEA5E, 100 #FA6728, 200 #D6D5D4, 300 #14A9FF, 400 #0089D9, 500 #78D44A, 600 #FFB0B9, 700 #FFCA45, 800 #157300, 900 #B88F53.

## Tasks
- [x] Test and implement color normalization, defaults, contrast and API persistence. Reject invalid/translucent values; retain saved colors when old clients omit color. Do not send color to subcategories.
- [x] Add rerunnable expansion SQL that initializes only unset colors, preserves existing custom colors and changes no book/category relationships. Document migration-before-deploy order.
- [x] Test and implement responsive major-category cards, sibling edit/delete actions and a visual color picker (no HEX text field) in the existing form. Preserve children/parish views and permission checks.
- [x] Run regressions, type/lint checks, isolated SQL checks if the local test DB runtime is available, and desktop/mobile UI checks. Commit the completed change without pushing or changing the live DB.

## Review Focus
- Old clients omitting color must not reset a custom color.
- Re-running the migration must not overwrite administrator changes.
- Color-only edits must work for groups that have subcategories.
- Buttons must not contain other buttons; long labels must wrap on mobile.
- White/black text must retain readable contrast on all custom colors.

## Deployment
1. Run `sql/book-category-group-colors.sql` in the Supabase SQL editor before deploying the UI. This adds a column only; existing clients remain compatible.
2. Check the returned code/label/color rows, then deploy the application.
3. Edit a category color and reload to verify persistence. No SQL has been run against the shared database by the agent.

## Verification
- 45 focused catalog tests passed, along with the complete non-migration check-script suite.
- TypeScript and ESLint passed for changed source and test files.
- Local PGlite migration test passed (initial palette, rerun preservation, legacy inserts, invalid/null rejection).
- Actual component markup with application CSS inspected at desktop and 390px mobile sizes, including the mobile edit modal; no horizontal overflow. Interaction and API behavior covered by unit fixtures, not a live authenticated DB write.
