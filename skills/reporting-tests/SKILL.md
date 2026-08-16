---
name: reporting-tests
description: Use after writing or changing test code, when the user asks what the tests cover, which parts are untested, why a test fails, or wants a readable view of the test suite. Keywords - 테스트 리포트, 테스트 문서, 무슨 테스트, 어디까지 테스트, 테스트 커버리지, 커버리지, 테스트 결과, 테스트 대시보드, test report, test coverage, what do the tests cover.
---

# Reporting Tests

## Overview

Test files are written for the runner. This skill produces the view written for the **human**:
`docs/tests/index.html` — one self-contained dashboard for the whole project, answering three
questions per test file: **무엇을 검증하는가**, **어디까지 보고 어디는 안 보는가**, **지금 결과가 무엇인가**.

Two sources, and only these two:

1. **The test files themselves** — read them. Case names, mocks, and assertions come from the source, never from memory.
2. **A real test run** — you execute `test_command` and read its output. Nothing you did not observe gets a result.

**Anything you did not read or run is `⏳ 미실행`.** A guessed ✅ is worse than an empty cell: it tells
the reader a behavior is protected when nothing protects it.

## When to Run

- After a step that created or modified test files (blueplan:executing-steps step 6b)
- After finishing a RED→GREEN→REFACTOR cycle outside a plan (blueplan:enforcing-tdd)
- On demand: "테스트 뭐뭐 있어?", "어디까지 테스트한 거야?", "커버리지 보여줘"

Do not re-render for a step that touched no test file — the dashboard would be identical and the
suite run is wasted time.

## Input: what to collect before writing anything

| Report section | Source |
|---|---|
| 실행 명령·커버리지 명령 | `.claude/docs/testing.md` (Runner & Commands) |
| 테스트 파일 목록 | the layout rule in `.claude/docs/testing.md`, verified against the filesystem |
| 케이스 이름·의미 | the test file: `it`/`test`/`describe` names + what the assertions actually check |
| 검증 대상 | imports of the test file, and the public interface it exercises |
| 경계 (안 보는 것) | mocks/stubs/fakes in the file, skipped cases, branches with no assertion |
| 결과·소요 | your own run of `test_command` |
| 커버리지 수치 | the coverage command's output, if `.claude/docs/testing.md` defines one |
| 테스트 없는 곳 | source modules with no test file referencing them |

Inside a plan, a step's `**Test scope:**` line in `### Implementation Notes` records what the
implementer mocked and deliberately left uncovered. Use it as a starting point — then confirm it
against the test file, which is the authority. A scope line that disagrees with the code is a plan
error: fix the plan, then render.

If `.claude/docs/testing.md` has `TODO` where the commands belong, stop and fill it with the user
first. Guessing `npm test` produces a report that is wrong in the one field readers trust most.

## Reading a test file — what the reader actually needs

The case table's second column is the whole point. `should return 401` is the test's name, not its
meaning. Write what the behavior guarantees:

| 나쁜 예 | 좋은 예 |
|---|---|
| 401을 반환하는지 테스트 | 토큰 없는 요청은 핸들러에 닿기 전에 401로 끊긴다 |
| createUser 테스트 | 같은 이메일로 두 번 가입하면 두 번째는 저장되지 않고 에러가 난다 |

**어디까지 보나** is the second point. Every mock is a boundary — name it:

- `여기까지 검증한다` — the real code paths exercised: which module, which branches, which error cases
- `여기는 보지 않는다` — what a mock replaces (`fetch`를 모킹 → 실제 네트워크·타임아웃·재시도는 검증 안 됨),
  skipped cases and why, branches the file never enters, and what is deferred to integration/E2E

A test file whose "보지 않는 것" column is empty is almost always under-read. Mocks, unasserted
branches, and happy-path-only suites are the norm; find them.

## Running the suite

1. Run `test_command` from `.claude/docs/testing.md`. Capture the full output.
2. If a coverage command exists, run it too and take the summary numbers. If it does not, delete the
   coverage stat from the template — do not invent a percentage from case counts.
3. If the suite cannot run (missing deps, broken config), do NOT fill results. Fill the
   `⏳ 미실행` block with the exact reason and the failing output, and leave every 결과 cell `⏳ 미실행`.
4. Never edit a test to make the run cleaner. This skill reads and reports; it never touches test or
   source files.

Failures are reported, not hidden: a failing suite still produces a report, with the failure output
verbatim in 실패·스킵 상세 and a plain-Korean reading of what the failure means.

## The test map diagram

One mermaid graph: test files on one side, the source modules they exercise on the other.

- Node labels are real paths (`src/auth/token.ts`), never `모듈 A`
- Source modules with no test pointing at them get a distinct style (gray/dashed) — this is the
  visual answer to "어디까지 테스트하나"
- If the project has fewer than three test files, skip the diagram and say so in one sentence — a
  two-node graph tells the reader nothing the cards do not

## The Process

### First generation (no HTML exists yet)

1. Read `.claude/docs/testing.md`; resolve the run/coverage commands and the layout rule.
2. List the test files; read each one completely.
3. Run the suite (and coverage), capturing output.
4. Copy `templates/test-report.html` (sibling of this SKILL.md — resolve relative to this skill's directory).
5. Fill every `{{SLOT}}`; delete blocks that do not apply (커버리지, 실패 경고, 미실행 안내).
6. Write to `docs/tests/index.html`.

File links are relative to `docs/tests/index.html`, so the repository root is `../../`:
`<a href="../../src/auth.test.ts">src/auth.test.ts</a>`. Verify one link resolves before finishing.

### Incremental update (HTML already exists)

Do **not** rewrite the whole file. Edit only the anchors that changed:

| Anchor | When to update |
|---|---|
| `<!-- SLOT:SUMMARY -->…<!-- /SLOT:SUMMARY -->` | every run (counts, last-run line, 실패·미실행 배너) |
| `<!-- TESTFILE:<path> -->…<!-- /TESTFILE:<path> -->` | that file's cases, bounds, or result changed |
| `<!-- SLOT:MAP -->…<!-- /SLOT:MAP -->` | a test file was added/removed, or it now exercises a different module |
| `<!-- SLOT:FAILURES -->…<!-- /SLOT:FAILURES -->` | any failure or skip appeared or cleared |
| `<!-- SLOT:GAPS -->…<!-- /SLOT:GAPS -->` | a source module gained or lost coverage |

A deleted test file's card is removed, not left stale. Rewrite the whole file only when the test
layout itself is restructured.

### Verify before finishing

- `grep -c '{{' docs/tests/index.html` must be 0
- Every test file on disk has exactly one card, and every card has a `TESTFILE:` anchor pair
- Summary counts equal the sum of the case-table rows
- No 결과 cell says ✅ for a case you did not see pass in the run output

## Secrets — same rule as everywhere else

This file gets committed. Before pasting any run output:

- Mask tokens, keys, connection strings, passwords — keep the variable name and first 4 characters
- Fixture data is a common leak: test files carry real-looking credentials and personal data. A
  fixture value goes in the report only when it is meaningless outside the test.
- If output cannot be masked confidently, write `<출력 생략 — 시크릿 포함>`

## What NOT to Do

- Do not write or modify test code, source code, or test config — this skill reads, runs, and writes one HTML file
- Do not report a case as passing because it "obviously would"
- Do not present coverage percentage as a quality claim; it is a measured number in one row, nothing more
- Do not silently drop a failing test from the report to make the page look green
- Do not duplicate the plan's step narrative here — that is blueplan:reporting-progress. This page is about the tests.

## Checklist

- [ ] Commands resolved from `.claude/docs/testing.md` (no `TODO` left in it)
- [ ] Every test file read; case meanings written as behaviors, not restated names
- [ ] 여기는 보지 않는다 filled for every file (mocks, skips, unasserted branches)
- [ ] Suite actually run; unrun parts marked `⏳ 미실행` with a reason
- [ ] Failures shown verbatim with a plain-Korean reading
- [ ] Map nodes are real paths; untested modules visually distinct
- [ ] Secrets and fixture data masked; no `{{` left
- [ ] Written to `docs/tests/index.html`; a file link verified to resolve
