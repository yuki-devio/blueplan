---
name: using-blueplan
description: Use when starting work in a project that uses blueplan, when the user mentions blueplan, or when unsure how to structure documentation-driven development work. Keywords - blueplan, 블루플랜, workflow, 워크플로우, 개발 프로세스, 어디서부터, 어떻게 시작.
---

# Using blueplan

## Overview

blueplan's philosophy: **documents are the shared memory between sessions.** Sessions are ephemeral; `docs/` and `.claude/docs/` persist. Any session can pick up any feature because the plan file carries the full context — including implementation notes from steps done by other sessions.

## The Lifecycle

```
initializing-blueplan        (once per project: scaffold docs/ + .claude/docs/)
        │
        ▼
documenting-projects         (ongoing: architecture, PRD, ADRs stay current)
        │
        ▼
planning-features            (per feature: docs/plans/NNN-*.md, step-by-step, approved by user)
        │
        ▼
executing-steps ◄──────┐     (loop: dispatch subagent → verify → record notes → next step)
        │              │
        └──────────────┘
   cross-cutting, always on:
   • enforcing-tdd            (tests first, in every implementation)
   • consulting-references    (.claude/docs/INDEX.md routing before any task)
```

## Which Skill When

| Situation | Skill |
|---|---|
| New/existing project, no `docs/` structure yet | blueplan:initializing-blueplan |
| Architecture changed, decision made, PRD update | blueplan:documenting-projects |
| Feature needs to be broken into steps before coding | blueplan:planning-features |
| "구현해줘", "이어서 해줘", executing/resuming a plan | blueplan:executing-steps |
| Writing any implementation code | blueplan:enforcing-tdd |
| About to code/design/test — which project rules apply? | blueplan:consulting-references |

## The One Rule

**Never implement multi-step feature work without a plan document in `docs/plans/`.** No plan → blueplan:planning-features first. This is what makes work resumable by any session.

If the superpowers plugin (or similar) is also installed: in a blueplan project, blueplan's skills govern the docs/plan/execution workflow — do not mix two plan formats in one project.
