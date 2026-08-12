---
name: reporting-progress
description: Use when a plan step finishes and the HTML implementation report needs regenerating, or when the user asks to see what was built, wants a visual summary of a plan, asks which commands were run, or says the plan document is hard to read. Keywords - 리포트, 보고서, html, 다이어그램, 뭐 만들었어, 어떻게 구현했어, 무슨 명령어 썼어, 진행 상황, 시각화, progress report, plan report.
---

# Reporting Progress

## Overview

The plan file is written for the next agent. This skill produces the view written for the **human**:
`docs/plans/NNN-<slug>.html` — one self-contained page per plan, showing what the feature is,
how it works as a diagram, which technologies it uses, and step by step what was built, which
shell commands ran, what each command does, and what it printed.

**The report is a rendering of the plan file. The plan file is the source of truth.** Never put a
fact in the HTML that is not in the plan document — if something is missing from the plan, fix the
plan first, then re-render.

## When to Run

- After blueplan:executing-steps records a step's Implementation Notes (step 6 of its loop) — every step, no batching
- When a plan reaches `status: complete`
- On demand: "플랜 003 리포트 보여줘", "지금까지 뭐 만들었어?"

If the plan has no completed step yet, still generate the report — the reader wants to see the plan
and the diagram before any code exists. Steps show as 대기 with empty bodies.

## Input: what the plan must carry

Read from `docs/plans/NNN-<slug>.md`:

| Report section | Source |
|---|---|
| 개요 | `## Context` |
| 아키텍처 다이어그램 | `## Context`, `architecture.md`, and files listed across steps |
| 스텝 의존 그래프 | each step's `Depends on:` |
| 사용된 기술 | `Files touched` extensions, dependencies added (from **Commands run**), `test_command` |
| 스텝 본문 | each step's `### Implementation Notes` |
| 명령어 표 | each step's **Commands run** line in Implementation Notes |
| 테스트 증거 | **Test evidence** line |

**Commands run** is captured by the implementer subagent and recorded by the orchestrator. If a
completed step has no Commands run entry, write `기록되지 않음` in the report — do not invent
plausible commands. A fabricated command log is worse than an empty one.

## Classifying commands — the part readers actually need

Every command gets a class. This is what turns a log into something a reader can judge.

| 표기 | 뜻 | 판별 기준 | 예 |
|---|---|---|---|
| 🔍 조회 | 상태를 읽기만 함. 되돌릴 것이 없음. | 파일·DB·원격을 바꾸지 않음 | `git status`, `ls`, `npm ls`, `cat`, `grep` |
| ▶️ 실행 | 코드를 돌림. 부수효과는 코드에 달림. | 테스트·빌드·개발서버 | `npm test`, `npm run build`, `tsc --noEmit` |
| 📝 변경 | 파일이나 의존성을 바꿈. 되돌릴 수 있음. | git·패키지매니저로 복구 가능 | `npm install`, `git commit`, `mkdir` |
| ⚠️ 파괴 | 되돌리기 어렵거나 불가능. | 데이터·히스토리·원격 상태 손실 | `rm -rf`, `git reset --hard`, `git push --force`, `prisma migrate reset` |

각 명령어에는 **한 줄 설명을 한국어로** 붙인다. `npx vitest run src/auth.test.ts`를
"vitest로 테스트 실행"이라고만 쓰면 안 된다 — "auth 테스트 파일 하나만 실행. 파일을 바꾸지
않고 결과만 출력하는 조회성 명령"처럼, 무엇을 하고 무엇을 하지 않는지가 드러나야 한다.

⚠️ 파괴로 분류된 명령이 하나라도 있으면 리포트 상단 요약에 눈에 띄게 표시한다. 사용자가
리포트를 열자마자 알아야 하는 정보다.

## Diagrams

Two mermaid diagrams, both generated from the plan:

1. **동작 다이어그램** — how the feature actually works: request/data flow through the files the
   steps created. Draw the real mechanism (which module calls which, where data enters and leaves),
   not a restatement of the step list.
2. **스텝 의존 그래프** — nodes are steps, edges are `Depends on:`. Color by status
   (done / in-progress / pending / blocked).

Diagram rules:

- Node labels name real files, modules, or routes from the plan — never `Step 1`, `모듈 A`
- If the feature is a straight line with no branching, one diagram is enough — skip the flow diagram and say why in a sentence rather than drawing a trivial chain
- Mermaid loads from CDN with a `<pre>` fallback that shows the diagram source, so the page stays readable offline
- Escape Korean labels in quotes: `A["인증 미들웨어"]`

## The Process

### First generation (no HTML exists yet)

1. Read the plan file completely.
2. Copy `templates/report.html` (sibling of this SKILL.md — resolve relative to this skill's directory).
3. Fill every `{{SLOT}}`. Slots left unfilled must be removed, not left as `{{...}}` in the output.
4. Write to `docs/plans/NNN-<slug>.html` — same basename as the plan.

### Incremental update (HTML already exists)

Do **not** rewrite the whole file. The template has anchor comments; Edit only these regions:

| Anchor | When to update |
|---|---|
| `<!-- SLOT:SUMMARY -->…<!-- /SLOT:SUMMARY -->` | every step (progress counts, status, 파괴 명령 경고) |
| `<!-- SLOT:STEPGRAPH -->…<!-- /SLOT:STEPGRAPH -->` | every step (node colors change) |
| `<!-- SLOT:FLOW -->…<!-- /SLOT:FLOW -->` | when the step added a module/route that changes the mechanism |
| `<!-- SLOT:TECH -->…<!-- /SLOT:TECH -->` | when a dependency or tool was added |
| `<!-- STEP:N -->…<!-- /STEP:N -->` | the completed step only |

Rewrite the whole file only if the plan itself was restructured (steps added/removed/renumbered).

### Verify before finishing

- Open the file and confirm no `{{` remains: `grep -c '{{' docs/plans/NNN-*.html` must be 0
- Every completed step has a card; every card's status matches the plan's `**Status:**` line
- Command counts in the summary match the rows in the step tables

## Secrets — same rule as everywhere else

Command output goes into a file that gets committed. Before writing any output block:

- Mask tokens, keys, connection strings, and passwords — keep the variable name and first 4 characters only
- Never paste the contents of `.env`, `~/.aws/credentials`, or auth headers
- A command like `curl -H "Authorization: Bearer sk-..."` gets the header value masked in the command itself, not just the output

If a step's output cannot be masked confidently, write `<출력 생략 — 시크릿 포함>` instead of guessing.

## What NOT to Do

- Do not invent commands, results, diagrams, or technologies not present in the plan
- Do not write implementation code or touch source files — this skill only reads the plan and writes one HTML file
- Do not summarize a failing step as if it succeeded. `blocked` steps get a red card stating exactly what fails.
- Do not delete a step card when a step is redone — update it in place so the reader sees current state

## Checklist

- [ ] Plan file read; report reflects its current Status lines exactly
- [ ] Every completed step has a card with 무엇을/파일/결정/명령어/테스트 증거
- [ ] Every command classified (🔍/▶️/📝/⚠️) with a Korean one-line explanation
- [ ] ⚠️ 파괴 commands surfaced in the top summary, or confirmed there are none
- [ ] Diagram nodes name real files/modules, not step numbers
- [ ] Secrets masked; no `{{` left in the output
- [ ] Written to `docs/plans/NNN-<slug>.html`
