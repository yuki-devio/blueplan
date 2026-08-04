---
name: planning-features
description: Use when a feature, refactor, or fix needs an implementation plan before any code is written, or when the user asks to plan multi-step work. Keywords - plan, implementation plan, feature plan, 플랜, 계획, 구현 계획, 단계별 계획, 설계, 기능 개발 준비.
---

# Planning Features

## Overview

A plan is written for a stranger. Any session with ZERO prior context must be able to open `docs/plans/NNN-<slug>.md` and execute it correctly. If executing the plan requires remembering this conversation, the plan is incomplete.

Plans live in the project's `docs/plans/` directory, one file per feature. They are the shared memory between sessions: `blueplan:planning-features` writes them, `blueplan:executing-steps` executes them and appends implementation notes.

## When to Use

- A feature or fix will take more than one sitting or more than ~3 files
- The user asks for a plan (플랜, 계획) for upcoming work
- You are about to implement something with no plan document — stop and write one first

**When NOT to use:** trivial single-file changes the user wants done immediately.

## Prerequisites

**REQUIRED SUB-SKILL:** blueplan:consulting-references — read the project's `.claude/docs/INDEX.md` routing before planning, so steps reference the right conventions/design docs.

- The feature should exist in `docs/prd.md` (at least one line). If it doesn't, add it via blueplan:documenting-projects first — a plan without a product reason is scope creep.
- Get `test_command` from `.claude/docs/testing.md` if present; otherwise detect it (package.json scripts, Makefile, etc.) and confirm with the user.

## The Process

1. **Number it.** `ls docs/plans/` → next `NNN` (zero-padded, e.g. `003`). Filename: `docs/plans/NNN-<feature-slug>.md`.
2. **Copy the template.** Copy `templates/plan-template.md` from this skill's own directory (resolve relative to this SKILL.md, not the project cwd).
3. **Fill the header.** Frontmatter (`status: draft`), `## Context` (3–8 sentences for a zero-context reader), `## Out of Scope`, `references` (PRD section, architecture section, relevant `.claude/docs/` files), exact `test_command`.
4. **Decompose into steps.** Apply the step-sizing rules below. For each step fill: Goal, Files (paths from repo root), Test Spec, Implementation Guidance, Acceptance Criteria. Leave every `### Implementation Notes` slot as the placeholder — the executor fills those.
5. **Fill the Step Index** table and `total_steps`.
6. **Run the Stranger Test** (below), fix what fails.
7. **Review with the user.** Walk through the steps. Only after explicit approval, set `status: approved`. Never start executing a `draft` plan.

## Step-Sizing Rules

Each step must be:

- **Independently completable** by one subagent in one session, touching ~1–5 files
- **Testable on its own**: it has a concrete Test Spec, and the whole suite is green when the step is done — never leave the build broken between steps
- **Ordered by dependency**: `Depends on:` lists the step numbers whose Implementation Notes this step needs
- **Specific**: if you cannot write the Test Spec for a step, the step is not understood yet — split it or research first

## The Stranger Test

Re-read the finished plan pretending total amnesia:

- Is every file path written from the repo root?
- Is every referenced concept either explained in Context or linked in `references`?
- Could you execute Step 1 using only this file and the referenced docs?
- Does any step say "etc.", "and so on", or "the rest"?

If any answer is wrong, the plan fails. Fix it before review.

## Who Writes What

| Field | Planner (this skill) | Executor (executing-steps) |
|---|---|---|
| Frontmatter except `current_step`/`updated`/`status` transitions | ✅ | — |
| Context, Out of Scope, Step Index rows | ✅ | updates Status column |
| Per-step Goal/Files/Test Spec/Guidance/Criteria | ✅ | — |
| Per-step `**Status:**` line | sets `pending` | ✅ transitions |
| `### Implementation Notes` | leaves placeholder | ✅ fills |

## Red Flags — the plan is not ready

- A step titled "implement the rest" or "polish"
- A Test Spec that says "add tests" without naming behaviors
- Context that references "as discussed" or this conversation
- No `test_command`, or one you never ran to verify it works
- Starting to code while `status: draft`

## Checklist

- [ ] Feature exists in `docs/prd.md`
- [ ] `.claude/docs/INDEX.md` routing consulted; relevant docs listed in `references`
- [ ] Every step passes the step-sizing rules
- [ ] Stranger Test passed
- [ ] User approved → `status: approved`
