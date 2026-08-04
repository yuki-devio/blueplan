---
name: initializing-blueplan
description: Use when setting up blueplan in a new or existing project, scaffolding docs folders, or when the user asks to initialize the documentation structure. Keywords - init, initialize, scaffold, setup, 초기화, 세팅, 셋업, 프로젝트 시작, 문서 구조 생성, 블루플랜 설치.
---

# Initializing blueplan

## Overview

Scaffolds the two documentation trees blueplan needs in a target project:

- `docs/` — project memory: `architecture.md`, `prd.md`, `adr/`, `plans/`
- `.claude/docs/` — binding reference rules routed via `INDEX.md`: `conventions.md`, `design-guide.md`, `testing.md`

Templates live in this skill's `templates/` directory (`templates/docs/` → project `docs/`, `templates/claude-docs/` → project `.claude/docs/`). Resolve template paths relative to this SKILL.md, not the project cwd.

## The Process

### 1. Inspect the project

- Language, framework, test runner (check `package.json`, `Makefile`, `pyproject.toml`, etc.)
- Existing `docs/`, `.claude/docs/`, `CLAUDE.md` — note what already exists

### 2. Copy templates — never overwrite

For each template file, if the target does not exist, copy it. If it EXISTS, do not overwrite: report it, and offer to merge missing sections instead. User content always wins.

### 3. Adapt

- Replace `<PROJECT_NAME>` everywhere
- `testing.md`: fill the detected test commands (confirm with the user if ambiguous) — this is the canonical source plans copy `test_command` from
- `INDEX.md`: keep all seeded rows; if a doc type clearly doesn't apply (e.g. design-guide for a pure CLI/library), you may comment out its row — but keep the file for later
- Leave genuinely project-specific content as the `TODO(프로젝트별로 작성)` markers — do NOT invent conventions the user never stated. **Detected facts are not inventions**: things observable from the codebase (language, module system, directory layout, existing dependencies) SHOULD be written into `architecture.md`'s Overview/Module Map even without the user

### 4. Wire up CLAUDE.md

Append this block to the project's `CLAUDE.md` (create the file if absent; skip if an equivalent block exists):

```markdown
## blueplan

- Before any task, consult `.claude/docs/INDEX.md` and read the matching reference docs (blueplan:consulting-references).
- Multi-step feature work requires a plan in `docs/plans/` (blueplan:planning-features) executed step-by-step with implementation notes (blueplan:executing-steps).
- TDD is mandatory (blueplan:enforcing-tdd).
- Project memory lives in `docs/` — architecture, PRD, ADRs (blueplan:documenting-projects).
```

### 5. Fill the seed docs

Ask the user 2–4 questions to draft `architecture.md` (System Overview, Module Map) and `prd.md` (Product Goal, initial Features rows) for the CURRENT state of the project. If the user is unavailable or defers, leave the `TODO` markers — they are grep-able (`grep -rn "TODO" docs/`).

### 6. Report

List created files, skipped (already existing) files, and remaining TODOs.

## What NOT to Do

- Never overwrite or delete existing user docs
- Never invent PRD content, conventions, or design rules — TODO markers beat plausible fiction
- Don't scaffold into the blueplan plugin repo itself; the target is the user's project

## Checklist

- [ ] Existing files detected and preserved
- [ ] `docs/` + `.claude/docs/` trees created; `<PROJECT_NAME>` replaced
- [ ] Test commands filled in `testing.md` (or confirmed TODO)
- [ ] CLAUDE.md pointer block added
- [ ] Remaining TODOs reported to the user
