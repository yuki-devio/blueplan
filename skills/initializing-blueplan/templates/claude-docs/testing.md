<!-- 테스트 정책. 플랜 문서의 test_command는 이 파일이 원본입니다. -->

# Testing — <PROJECT_NAME>

## Runner & Commands

<!-- 정확한 명령을 적으세요. blueplan 플랜 문서들이 여기서 test_command를 복사합니다. -->

- Full suite: `TODO(프로젝트별로 작성)` — e.g. `npm test`
- Single file: `TODO` — e.g. `npx vitest run path/to/file.test.ts`
- Watch: `TODO`

## Directory Layout

- TODO(프로젝트별로 작성) — e.g. tests co-located as `*.test.ts` next to source

## Policy

- TDD is mandatory: tests first, observed failing, then implementation (see blueplan:enforcing-tdd)
- Unit vs integration: TODO(프로젝트별로 작성)
- Coverage expectations: TODO
- Mocking policy: TODO — e.g. mock only network/clock/fs; prefer real objects
