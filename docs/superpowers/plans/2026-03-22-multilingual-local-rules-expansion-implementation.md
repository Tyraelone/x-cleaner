# Multilingual Local Rules Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand built-in local rules for practical Chinese and English abuse matching, then cut a new packaged extension release.

**Architecture:** Keep the current local-rule engine and Unicode-aware matcher in place, but expand the built-in rule tables with higher-confidence multilingual phrases and add focused regression tests. After verification, bump the extension version and build a distributable zip artifact for release.

**Tech Stack:** TypeScript, Vitest, Vite, Chrome MV3, xregexp

---

### Task 1: Expand Multilingual Rule Coverage

**Files:**
- Modify: `/Users/duanziyu/Documents/x-cleaner/tests/shared/rules.test.ts`
- Modify: `/Users/duanziyu/Documents/x-cleaner/src/shared/rules.ts`

- [ ] **Step 1: Write the failing tests**

Add focused tests for new anti-intellectual, hate, and harassment phrases in Chinese and English, plus a small neutral-text non-match case.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/shared/rules.test.ts`
Expected: FAIL on the newly added phrases because the built-in tables are still too small.

- [ ] **Step 3: Write minimal implementation**

Expand the built-in keyword arrays in `/Users/duanziyu/Documents/x-cleaner/src/shared/rules.ts` with high-confidence multilingual phrases only.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/shared/rules.test.ts`
Expected: PASS for the targeted rule tests.

### Task 2: Verify Full Test Suite

**Files:**
- Verify only

- [ ] **Step 1: Run the full suite**

Run: `npm test`
Expected: PASS with no failing test files.

### Task 3: Cut Release Artifact

**Files:**
- Modify: `/Users/duanziyu/Documents/x-cleaner/package.json`
- Modify: `/Users/duanziyu/Documents/x-cleaner/public/manifest.json`
- Verify: `/Users/duanziyu/Documents/x-cleaner/README.md`

- [ ] **Step 1: Bump the release version**

Update the version in `package.json` and `public/manifest.json` to the next patch release.

- [ ] **Step 2: Build the extension**

Run: `npm run build`
Expected: PASS and fresh `dist/` output.

- [ ] **Step 3: Package the extension**

Create a release zip from `dist/` named `x-cleaner-extension.zip`.

- [ ] **Step 4: Verify the packaged artifact exists**

Run a file listing command against `x-cleaner-extension.zip`.
Expected: zip file present and non-empty.
