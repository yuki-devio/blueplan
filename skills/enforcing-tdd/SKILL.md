---
name: enforcing-tdd
description: Use when implementing any feature or bugfix, before writing implementation code, or when tests are about to be skipped or written after the fact. Keywords - TDD, test first, red green refactor, unit test, 테스트, 테스트 먼저, 테스트 주도 개발, 티디디, 단위 테스트, 버그 수정.
---

# Enforcing TDD

## Overview

Write the test first. Watch it fail. Then write code. **A test you never saw fail proves nothing** — it might pass for the wrong reason, or test nothing at all.

**Violating the letter of this rule is violating its spirit.** There is no "TDD in spirit".

## The Iron Law

```
NO IMPLEMENTATION CODE WITHOUT A FAILING TEST FIRST
```

Wrote implementation before a test? Delete it. Start over. Don't keep it as "reference", don't "adapt it while writing tests" — delete means delete.

## The Cycle

### RED
1. Write ONE test for the next small behavior. The test name states the behavior.
2. Run the suite. The new test must FAIL, **for the expected reason**: a missing behavior. A compile error, import error, or typo is not a valid RED — fix those and re-run until the failure is the assertion you wrote.
3. Read the failure output. Keep it — it is your evidence.

### GREEN
4. Write the minimum code that makes the test pass. Resist building ahead of the tests.
5. Run the suite. The new test passes; nothing else broke.

### REFACTOR
6. With a green suite, clean up names, duplication, structure. Re-run. Repeat from RED for the next behavior.

## Test Quality Rules

- Test behavior through the public interface, not implementation details — a refactor should not break tests
- Prefer real objects over mocks; mock only true externals (network, clock, filesystem when slow)
- One behavior per test; the name is the specification
- Follow the project's `.claude/docs/testing.md` for runner, layout, and fixture policy

## The Bugfix Rule

Reproduce the bug as a failing test BEFORE touching the code. The fix is done when that test passes and the suite stays green. A bugfix without a regression test is a bug scheduled to return.

## Common Rationalizations

| Excuse | Reality |
|---|---|
| "Too simple to test" | Simple code breaks. The test takes 30 seconds. |
| "I'll add tests after" | Tests written after pass immediately — they prove nothing and mirror the implementation's blind spots. |
| "Tests-after achieves the same goal" | Tests-first asks "what SHOULD this do"; tests-after asks "what does this do". Different questions, different quality. |
| "Deadline pressure" | Debugging untested code takes longer than writing the test. |
| "It's just a spike/prototype" | Fine — then delete the spike and rebuild it test-first. Spikes that ship are how untested code ships. |
| "The framework/library is hard to test" | Extract your logic from the framework edge and test the logic. |

## Red Flags — STOP and Start Over

- An implementation diff exists and no test diff does
- You are about to run the app to "check it works" instead of writing a test
- A new test passed on its very first run
- "I already manually tested it"

## Within blueplan

`blueplan:executing-steps` embeds this mandate into every implementer subagent prompt (subagents don't load skills), and the orchestrator rejects any step report lacking the failing-run output. When you code OUTSIDE a plan, this skill still applies — TDD is not conditional on having a plan.
