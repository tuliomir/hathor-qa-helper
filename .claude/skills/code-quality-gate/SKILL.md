---
name: code-quality-gate
description: >-
  This skill should be used before presenting completed work to the user, before
  committing code, before claiming a feature is "done" or "ready", before creating
  a pull request, or when the user asks to "check the code", "run the checks",
  "run the quality gate", "validate before commit", "make sure tests pass",
  "fix lint", or "prepare for review". Enforces a two-tier quality gate
  (review-ready → commit-ready) using the project's bun scripts to prevent
  tech debt from broken tests and lint errors.
---

# Code Quality Gate

Procedural workflow that enforces code quality checks before presenting work to
the user or committing changes. This exists because skipping checks has led to
accumulating tech debt from broken tests and lint violations.

## Core Principle

Never claim work is complete, present a finished feature for feedback, or create
a commit without first passing the appropriate quality gate. Silence from the
test suite is not the same as passing — always run the checks.

## Two-Tier Gate

### Tier 1 — Review-Ready (before presenting work to user)

Run these four commands **in sequence** after finishing implementation and before
asking the user for feedback:

```bash
bun run format       # Auto-format all source files
bun run lint:fix     # Auto-fix lint violations
bun run typecheck    # Verify TypeScript types compile
bun run build        # Full production build (includes tsc -b + vite)
```

**Sequence matters.** `format` and `lint:fix` may modify files, so run them
first. `typecheck` catches type errors without building. `build` is the final
gate — it runs the TypeScript project builder plus Vite bundling.

If any command fails:

1. Read the error output and fix the root cause.
2. Re-run the failing command to confirm the fix.
3. Re-run all subsequent commands in the sequence (a format fix may surface a
   new lint issue, etc.).
4. Do not present work to the user until all four pass cleanly.

### Tier 2 — Commit-Ready (before creating any git commit)

After Tier 1 passes, additionally run:

```bash
bun run test         # Unit/integration tests (bun test)
bun run test:e2e     # Playwright end-to-end tests
```

If any test fails:

1. Investigate the failure — determine whether it's caused by the current
   changes or was pre-existing.
2. If caused by current changes: fix the code and re-run from Tier 1.
3. If pre-existing: inform the user with the exact failure output and ask how
   to proceed. Do not silently skip it.

Only after both tiers pass cleanly is the code eligible for a commit.

## Commit Workflow

After both tiers pass:

1. Stage only the files relevant to the change (`git add <specific files>`).
2. Write a scoped commit message: `<type>(<scope>): <description>`.
   - Types: `feat`, `fix`, `refactor`, `chore`, `test`, `docs`, `style`.
   - Scope: the area affected (e.g., `send-tx`, `timelock`, `snap`, `cleanup`).
   - Example: `feat(send-tx): add timelock picker to RPC and snap outputs`
3. If the diff spans multiple logical changes, split into multiple commits with
   distinct scopes. Each commit must independently pass both tiers.

### Splitting a Large Diff

When a single implementation session produces changes across multiple concerns:

1. Run both tiers on the full working tree first to confirm everything passes.
2. Use `git add -p` or stage specific files to create the first scoped commit.
3. Verify the remaining unstaged changes still pass Tier 1 (typecheck + build)
   — a partial commit must not break the build.
4. Repeat for each subsequent commit.

## When to Run Each Tier

| Situation                                  | Tier 1 | Tier 2 |
|--------------------------------------------|--------|--------|
| Presenting a feature for user feedback     | Yes    | No     |
| About to create a git commit               | Yes    | Yes    |
| About to create or update a pull request   | Yes    | Yes    |
| Quick exploratory change (user will review) | Yes    | No     |
| User explicitly asks "run the checks"      | Yes    | Yes    |

## Handling Long-Running Tests

The e2e tests (`bun run test:e2e`) require a running dev server and may take
several minutes. When running Tier 2:

- Start the dev server if not already running (`bun run dev:bg`). If the server
  is in a bad state, use `bun run dev:restart` for a clean restart.
- Run `bun run test` and `bun run test:e2e` sequentially (not in parallel).
- If e2e tests are slow, inform the user of progress at reasonable intervals.

## Anti-Patterns to Avoid

- **Skipping checks because "it's a small change"** — small changes break builds
  too. Always run Tier 1 at minimum.
- **Running only typecheck and skipping build** — Vite bundling catches issues
  that `tsc --noEmit` does not (missing imports, circular dependencies).
- **Committing with known test failures** — this is exactly the tech debt this
  gate prevents. Surface failures to the user instead.
- **Running format/lint after build** — run them first so their file changes are
  included in the typecheck and build verification.
- **Presenting code to the user and saying "I'll run checks after"** — run checks
  first, present verified code.