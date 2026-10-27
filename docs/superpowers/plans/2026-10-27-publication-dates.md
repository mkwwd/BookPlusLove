# Publication Dates Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement and verify each task.

**Goal:** Normalize publication dates without inventing missing months or days.

**Architecture:** Keep `books.pub_date` as text for year/month/day precision. Use one shared parser at the write boundaries and a separate Korean display formatter. Provide a preview-first, transactional SQL migration that leaves uncertain values unchanged.

**Tech Stack:** Next.js 16, TypeScript, PostgreSQL, existing SheetJS, Node tests and isolated PGlite.

**Spec:** Approved conversation requirements, captured below.

## Approved Design

- Store `YYYY`, `YYYY-MM`, or `YYYY-MM-DD`; keep absent values absent.
- Display known components as `YYYY년`, `YYYY년 MM월`, or `YYYY년 MM월 DD일`.
- Never guess missing date components or repair malformed dates automatically.
- Normalize manual entry, edits, Excel imports and ISBN lookup results.
- Preserve unchanged malformed legacy dates when editing unrelated fields.
- Do not execute migration SQL against production, push or deploy in this task.

## Review Focus

- Leap years, zero components, impossible days and five-digit years must be rejected.
- Unknown precision must not become January 1 or the first of a month.
- Existing malformed data must not block unrelated edits or disappear from display.
- Excel numeric date cells must use workbook date-system metadata, not a guessed century.
- SQL preview, apply and rerun must preserve all unrelated values and book references.

## Tasks

- [x] Write failing parser/formatter and API boundary tests in `scripts/check-publication-dates.mjs`.
- [x] Add `src/lib/publicationDate.ts`; wire both admin write routes, ISBN lookup, Excel parsing and displayed dates. Verify focused unit/route checks.
- [x] Add `sql/normalize-publication-dates.sql` and instructions; test preview/apply/rerun with isolated PGlite and the same parser fixtures.
- [x] Run lint, types and applicable regression checks; review the diff before committing the complete work unit.

## Verification

- All 20 check scripts passed; focused migration tests also passed after review fixes.
- Lint and the final production build (including TypeScript) passed. The sandbox-only Turbopack child-process failure did not recur outside the sandbox.
- Review probes for invalid Excel serials, time-only cells and conditional/multi-section formats fail closed instead of inventing dates.
- Local public search results display padded Korean dates without page overflow. Authenticated admin submission was tested through mocked route boundaries, not a production write.
- No production migration, push or deployment was performed.
