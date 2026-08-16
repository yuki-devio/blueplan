<!-- 테스트 정책. 플랜 문서의 test_command는 이 파일이 원본입니다. -->

# Testing — <PROJECT_NAME>

## Runner & Commands

<!-- 정확한 명령을 적으세요. blueplan 플랜 문서들이 여기서 test_command를 복사합니다. -->

- Full suite: `TODO(프로젝트별로 작성)` — e.g. `npm test`
- Single file: `TODO` — e.g. `npx vitest run path/to/file.test.ts`
- Watch: `TODO`
- Coverage: `TODO` — e.g. `npx vitest run --coverage`. 측정하지 않는다면 `없음`이라고 적으세요.

## Directory Layout

- TODO(프로젝트별로 작성) — e.g. tests co-located as `*.test.ts` next to source

## Policy

- TDD is mandatory: tests first, observed failing, then implementation (see blueplan:enforcing-tdd)
- Unit vs integration: TODO(프로젝트별로 작성)
- Coverage expectations: TODO
- Mocking policy: TODO — e.g. mock only network/clock/fs; prefer real objects

## Report

테스트 대시보드는 `docs/tests/index.html` 입니다 (blueplan:reporting-tests 가 생성).
테스트 파일이 추가·수정되면 갱신되며, 위의 Full suite / Coverage 명령을 그대로 실행해 결과를 채웁니다.
따라서 이 파일의 명령이 틀리면 리포트도 틀립니다 — `TODO`를 남겨두지 마세요.
