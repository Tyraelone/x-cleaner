# Volcengine Ark Provider Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Volcengine Ark as a selectable AI moderation provider and make it work through the extension's existing AI review flow.

**Architecture:** Extend the shared provider enum and settings sanitization, then add an Ark-specific request path in the background AI module using Volcengine's OpenAI-compatible chat-completions API. Keep the UI shape unchanged apart from adding the provider option.

**Tech Stack:** TypeScript, Vitest, Chrome MV3

---

### Task 1: Add failing provider tests

**Files:**
- Modify: `/Users/duanziyu/Documents/x-cleaner/tests/background/ai.test.ts`
- Modify: `/Users/duanziyu/Documents/x-cleaner/tests/options/settings-form.test.ts`
- Modify: `/Users/duanziyu/Documents/x-cleaner/tests/shared/storage.test.ts`

- [ ] **Step 1: Write the failing tests**
- [ ] **Step 2: Run `npm test -- tests/background/ai.test.ts tests/options/settings-form.test.ts tests/shared/storage.test.ts` to verify they fail**
- [ ] **Step 3: Implement the minimal provider changes**
- [ ] **Step 4: Re-run the targeted tests to verify they pass**

### Task 2: Wire the provider through runtime code

**Files:**
- Modify: `/Users/duanziyu/Documents/x-cleaner/src/shared/types.ts`
- Modify: `/Users/duanziyu/Documents/x-cleaner/src/shared/storage.ts`
- Modify: `/Users/duanziyu/Documents/x-cleaner/src/background/ai.ts`
- Modify: `/Users/duanziyu/Documents/x-cleaner/src/background/index.ts`
- Modify: `/Users/duanziyu/Documents/x-cleaner/src/options/settings-form.ts`

- [ ] **Step 1: Add provider type and settings handling**
- [ ] **Step 2: Add Ark request/response handling**
- [ ] **Step 3: Add provider option in the UI**

### Task 3: Verify and document

**Files:**
- Modify: `/Users/duanziyu/Documents/x-cleaner/README.md`

- [ ] **Step 1: Run `npm test`**
- [ ] **Step 2: Update README provider docs**
- [ ] **Step 3: Run `npm run build`**
