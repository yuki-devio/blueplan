---
plan: NNN-<feature-slug>
title: <Feature name>
status: draft            # draft | approved | in-progress | complete | abandoned
current_step: 0          # last COMPLETED step number; 0 = none (cache — per-step Status lines are authoritative)
total_steps: N
created: YYYY-MM-DD
updated: YYYY-MM-DD
references:              # docs any executor must read before starting
  - docs/prd.md#<section>
  - docs/architecture.md#<section>
  - .claude/docs/conventions.md
test_command: "<exact command to run the full test suite, e.g. npm test>"
---

# Plan NNN: <Feature name>

## Context

<!-- 3–8 sentences written for a reader with ZERO prior context:
     what this feature is, why it is being built, and the current state
     of the codebase relevant to it. A fresh session must be able to
     execute this plan from this document alone. -->

## Out of Scope

- <explicit non-goals, so an executor does not gold-plate>

## Step Index

| # | Step | Status |
|---|------|--------|
| 1 | <title> | pending |
| 2 | <title> | pending |

---

## Step 1: <Imperative title>

**Status:** pending
<!-- pending | in-progress | done | blocked -->
**Depends on:** —
<!-- comma-separated step numbers, or — -->

### Goal

<One paragraph: the observable outcome of this step.>

### Files

- `path/from/repo/root.ts` — create | modify — <what changes>
- `path/from/repo/root.test.ts` — create — <what it tests>

### Test Spec (write these FIRST)

- <test case 1: given / when / then>
- <test case 2: given / when / then>

### Implementation Guidance

- <approach, APIs to use, known pitfalls>
- <which .claude/docs/ reference applies to this step>

### Acceptance Criteria

- [ ] Tests from Test Spec written first and observed failing
- [ ] `<test_command>` passes (the whole suite, not just new tests)
- [ ] <feature-specific criterion>

### Implementation Notes

_(empty until executed — filled by blueplan:executing-steps)_

---

## Step 2: <Imperative title>

**Status:** pending
**Depends on:** 1

### Goal

...

### Files

...

### Test Spec (write these FIRST)

...

### Implementation Guidance

...

### Acceptance Criteria

- [ ] Tests from Test Spec written first and observed failing
- [ ] `<test_command>` passes

### Implementation Notes

_(empty until executed — filled by blueplan:executing-steps)_
