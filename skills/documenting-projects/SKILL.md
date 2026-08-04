---
name: documenting-projects
description: Use when creating or updating project documentation - architecture docs, PRD, ADRs - or when a technical decision is made that future sessions must know about. Keywords - documentation, architecture doc, ADR, PRD, decision record, 문서화, 문서 작성, 아키텍처 문서, 의사결정 기록, 기획서, 요구사항.
---

# Documenting Projects

## Overview

`docs/` is the project's memory. Sessions forget; documents don't. Every doc is written for a reader with zero context: if understanding it requires having been in a past conversation, it is incomplete.

Layout (scaffolded by blueplan:initializing-blueplan):

```
docs/
├── architecture.md   # current system structure — always present tense
├── prd.md            # product goals + feature registry
├── adr/NNN-*.md      # immutable decision records
└── plans/NNN-*.md    # feature plans (owned by planning-features/executing-steps)
```

## When Each Doc Changes

| Event | Update |
|---|---|
| Chose X over Y (library, pattern, architecture) after real deliberation | New ADR |
| Module boundaries, data flow, or invariants changed | `architecture.md` (+ ADR if it was a decision) |
| New feature idea or scope change | `prd.md` Features table |
| Feature plan created | `prd.md` Features row links to `docs/plans/NNN-*.md` |
| Plan completed (executing-steps final step) | Check ALL of the above — did the work change any of them? |

## ADR Process

1. Next number: `ls docs/adr/` → `NNN` (000 is the copy-me template, never used directly)
2. Copy `docs/adr/000-adr-template.md` → `docs/adr/NNN-<decision-slug>.md`
3. Fill Context / Decision / Consequences / Alternatives; `Status: proposed`
4. User agrees → `accepted`
5. **Accepted ADRs are immutable.** Decision changed? Write a NEW ADR and mark the old one `superseded-by-NNN`. History is the point.

Record decisions, not trivia: "we use Postgres" is an ADR; "we renamed a variable" is not.

## Writing Rules

- Present tense, active voice: "The API layer validates input", not "we decided the API layer will..."
- Link, don't duplicate: PRD links to plans; architecture links to ADRs. Duplicated content diverges.
- Every doc answers: "what would a fresh session need to know?"
- Update `docs/` in the same session as the change — see below.

## Common Rationalizations

| Excuse | Reality |
|---|---|
| "I'll document it later" | Later = another session that doesn't remember. Document now or lose it. |
| "It's obvious from the code" | Code shows WHAT, never WHY. The why is what ADRs hold. |
| "It was a small decision" | If a future session could plausibly redo the debate, record it. |
| "The docs are already stale, why bother" | Staleness is the argument FOR updating, not against. Fix what you touched. |

## Checklist (after any significant change)

- [ ] Decision made → ADR written and numbered
- [ ] Structure changed → `architecture.md` reflects the CURRENT system
- [ ] Scope changed → `prd.md` Features table current
- [ ] No content duplicated across docs — linked instead
