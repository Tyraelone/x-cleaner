# Blocked Content Folding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every blocked classification collapse by default and support folding the same content again after expansion.

**Architecture:** Keep classification orchestration in the content bootstrap and upgrade the render layer from a one-shot placeholder button into a reversible two-state fold UI. Automatic re-collapse protection should stay fingerprint-based, but manual re-collapse must bypass that guard.

**Tech Stack:** TypeScript, Vitest, jsdom, Chrome Extension content scripts

---

## Planned File Structure

- `src/content/index.ts`
  - Remove the special-case that skips collapsing blacklist decisions.
- `src/content/render.ts`
  - Replace the plain placeholder button with a styled fold card and add a fold-again control for expanded content.
- `tests/content/render.test.ts`
  - Cover the new reversible render behavior and updated fold UI.
- `tests/content/bootstrap.test.ts`
  - Verify blocked blacklist decisions collapse through the content bootstrap path.

### Task 1: Route All Blocked Decisions Through Collapse

**Files:**
- Modify: `src/content/index.ts`
- Test: `tests/content/bootstrap.test.ts`

- [ ] **Step 1: Write the failing blacklist-collapse bootstrap test**
- [ ] **Step 2: Run the targeted test and verify it fails for the current blacklist skip path**
- [ ] **Step 3: Remove the blacklist collapse bypass with minimal code**
- [ ] **Step 4: Re-run the targeted bootstrap test and verify it passes**

### Task 2: Add Reversible Fold UI

**Files:**
- Modify: `src/content/render.ts`
- Test: `tests/content/render.test.ts`

- [ ] **Step 1: Write failing tests for the fold card text, expand behavior, and fold-again control**
- [ ] **Step 2: Run the targeted render tests and verify they fail**
- [ ] **Step 3: Implement the minimal two-state fold UI**
- [ ] **Step 4: Re-run the targeted render tests and verify they pass**

### Task 3: Verify The Behavior End To End

**Files:**
- Test: `tests/content/render.test.ts`
- Test: `tests/content/bootstrap.test.ts`

- [ ] **Step 1: Run the targeted content tests**
- [ ] **Step 2: Run the full relevant test suite**
- [ ] **Step 3: Confirm there are no regressions in the updated collapse flow**
