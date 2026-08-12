---
name: executing-steps
description: Use when executing an implementation plan from docs/plans, resuming a partially completed plan, or continuing feature work started in another session. Keywords - execute plan, next step, resume, continue, 구현, 실행, 다음 단계, 이어서, 진행, 스텝 실행, 플랜 실행.
---

# Executing Steps

## Overview

You are the orchestrator. You read the plan, dispatch one implementer subagent per step, verify their work by running the tests yourself, and record implementation notes into the plan file. **The orchestrator never writes implementation code itself** — subagents implement; you stay lean so a long plan doesn't exhaust your context.

The plan file (`docs/plans/NNN-<slug>.md`) is the ONLY memory shared between steps and sessions. Every state change is written to disk immediately, never batched.

**REQUIRED SUB-SKILL:** blueplan:enforcing-tdd — governs all implementation (the mandate is also embedded in the implementer prompt, since subagents do not load skills).
**REQUIRED SUB-SKILL:** blueplan:consulting-references — route `.claude/docs/` docs into each dispatch.
**REQUIRED SUB-SKILL:** blueplan:reporting-progress — render the human-facing HTML report after each step is recorded.

## When to Use

- The user asks to implement/continue a feature that has a plan in `docs/plans/`
- The user says "이어서 해줘", "다음 단계 진행해줘", or a fresh session picks up in-progress work
- No plan exists for the requested feature → STOP, use blueplan:planning-features first. Never implement plan-less multi-step work.

## The Loop

### 1. Load & resume

Read the plan file top to bottom. Reconcile state: per-step `**Status:**` lines are authoritative; if frontmatter `current_step`/`status` disagree, fix the frontmatter now. If `status: draft` → stop and route to blueplan:planning-features for approval. On first execution, set `status: in-progress`.

### 2. Select a step

The next step = first `pending` step whose `Depends on:` steps are all `done`. If a step is `in-progress` from a dead session, inspect the working tree and tests to decide: finish it via a fix dispatch, or reset it to `pending`. Mark the selected step `in-progress` and update `updated:` — write the file before dispatching.

### 3. Assemble the context package

Collect, verbatim:

- The plan's `## Context` section and `test_command`
- The selected step's full section
- The `### Implementation Notes` of every step it depends on, plus any earlier notes whose "Gotchas for next steps" is not "none"
- The reference docs routed for this step's task type (via `.claude/docs/INDEX.md`) — pass file paths, and inline only the sections that apply

### 4. Dispatch

Fill `implementer-prompt.md` (sibling of this SKILL.md — resolve relative to this skill's directory) with the context package and launch one subagent. One step per subagent, no batching.

### 5. Verify — never trust the report alone

- Run `test_command` yourself. It must pass entirely.
- Check the report includes the FAILING test run output (TDD evidence). A report without it is rejected — redispatch.
- Check each Acceptance Criterion.
- Spot-read the diff of the listed files for scope creep and convention violations.

### 6. Record

Fill the step's `### Implementation Notes` in this exact format:

```markdown
### Implementation Notes

> Completed: YYYY-MM-DD | Result: done

**What was done:** <2–5 sentences>
**Files touched:** `a.ts` (created), `b.ts` (modified — added X)
**Decisions made:** <deviations from the plan and why; "none" if none>
**Gotchas for next steps:** <traps, surprising APIs, changed assumptions; "none">
**Commands run:**
| `<command>` | 조회/실행/변경/파괴 | <무엇을 하는 명령인지> | <결과> |
**Test evidence:** `<test_command>` → <N passed> (observed failing first: <test names>)
```

Copy **Commands run** from the subagent's report verbatim, plus any command YOU ran during verification. This is the only record of what actually touched the machine — reconstructing it later is impossible. If the subagent omitted it, ask for it in a follow-up rather than writing `none`.

Then flip the step's `**Status:** done`, update its Step Index row, frontmatter `current_step` and `updated:`. Write the file before doing anything else.

### 6b. Render the report

Apply blueplan:reporting-progress to regenerate `docs/plans/NNN-<slug>.html` from the plan you just updated. Do this after the plan file is written, never before — the report renders the plan, so an unsaved plan produces a wrong report.

### 7. On failure

Verification failed → dispatch a fix subagent with the step section, the failure output, and the original report. Maximum 2 retries. Still failing → set the step `blocked`, write Implementation Notes with `Result: blocked` explaining exactly what fails and why, and stop for the user.

### 8. Repeat or close

Loop to 2 while eligible steps remain. When every step is `done`: set frontmatter `status: complete`, then apply blueplan:documenting-projects — did this feature change architecture or make decisions worth an ADR? Update `docs/` before declaring the feature finished.

## Session Boundaries

Spanning sessions is normal, not a failure. A fresh session needs nothing but the plan file: it runs step 1 of this loop and continues. This only works if you flushed every state change immediately — which is why recording (step 6) happens before anything else.

## Common Rationalizations

| Excuse | Reality |
|---|---|
| "This step is tiny, I'll just do it inline" | Inline work bloats orchestrator context and skips the note-taking discipline. Dispatch it. |
| "The subagent said tests pass" | Reports lie. Run `test_command` yourself, every step. |
| "I'll write the notes after finishing a few steps" | A crash loses everything. Notes are written per step, immediately. |
| "I'll regenerate the HTML report at the end, once" | The report is how the user follows along mid-work. A report that only exists after the last step is not a progress report. |
| "The commands were obvious, I'll reconstruct them" | Reconstructed logs are fiction. Record what ran or record that it wasn't captured. |
| "The plan is slightly wrong, I'll silently adapt" | Deviations go in **Decisions made** so later steps and sessions know. Large deviations → stop, revise the plan with the user. |

## Red Flags — STOP

- You are about to Edit/Write implementation code as the orchestrator
- A step is `done` but its Implementation Notes are empty
- You never saw the failing-test output for a step
- You are executing a plan whose `status` is `draft`

## Checklist (per step)

- [ ] Step selected by dependency rule; `in-progress` written to disk before dispatch
- [ ] Context package included dependency notes + routed reference docs
- [ ] `test_command` run by ME and passing
- [ ] Failing-first test evidence present in report
- [ ] Implementation Notes recorded in exact format; Status/Index/frontmatter updated
- [ ] **Commands run** captured from the subagent (not `none` by default), secrets masked
- [ ] `docs/plans/NNN-<slug>.html` re-rendered after the plan was written
