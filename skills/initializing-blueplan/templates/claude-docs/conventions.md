<!-- 프로젝트 코딩 컨벤션. 반복해서 지적하게 되는 규칙은 전부 여기에 적으세요.
     아래 Next.js 규칙은 프레임워크 표준이므로 그대로 두고, TODO 항목만 프로젝트에 맞게 채우면 됩니다.
     Next.js를 쓰지 않는 프로젝트라면 "Next.js" 섹션들을 통째로 삭제하세요. -->

# Coding Conventions — <PROJECT_NAME>

**스택:** Next.js `TODO(버전 — 예: 16.x)` · App Router · TypeScript
<!-- 버전이 중요합니다. v15와 v16은 미들웨어 파일명과 캐싱 규칙이 다릅니다. -->

> 인증·권한·DB·서버액션·외부 입력을 다루는 작업은 `.claude/docs/security.md`도 함께 읽는다.

## Language & Formatting

- TypeScript strict mode. `any` 금지 — 모르면 `unknown`으로 받고 좁힌다.
- 타입 에러는 경고가 아니다. `npx tsc --noEmit`이 깨진 상태로 머지하지 않는다.
- 포매팅은 사람이 논쟁하지 않는다. 포매터가 결정하고 IDE의 format-on-save를 켠다.
- 커밋 전 `TODO(예: npm run lint && npx tsc --noEmit)` 통과 필수. 이 검사는 pre-commit 훅(husky + lint-staged)으로 강제하며, 사람의 기억에 의존하지 않는다.
- TODO(프로젝트별로 작성) — 포매터(Prettier/Biome)와 실행 명령

## Naming

- 파일·폴더명은 `kebab-case`로 통일한다(`user-profile.tsx`). 규칙은 린트로 강제하고(eslint `check-file` 등) 리뷰에서 지적하지 않는다.
- 라우트 폴더는 URL 그대로. 특수 파일명(`page.tsx`, `layout.tsx`, `route.ts`)은 Next.js가 정한 이름이므로 변경 불가.
- 컴포넌트는 `PascalCase`, 훅은 `useCamelCase`, 서버 액션은 동사로 시작(`createPost`, `deleteUser`), boolean은 `is*`/`has*`.
- 라우팅에서 제외할 폴더는 `_` 접두사(`app/_components/`). 괄호 폴더 `(group)/`는 URL에 영향이 없다.

## Project Structure (App Router)

```
app/
├── layout.tsx           # 루트 레이아웃 (필수)
├── page.tsx             # /
├── loading.tsx          # Suspense 경계
├── error.tsx            # Error 경계 ('use client' 필수)
├── not-found.tsx
├── (group)/             # URL에 안 들어가는 그룹
├── _components/         # 라우팅 제외
├── [slug]/page.tsx      # 동적 세그먼트
└── api/<name>/route.ts  # API 엔드포인트
```

- 같은 폴더에 `page.tsx`와 `route.ts`를 함께 두지 않는다 — 충돌한다. API는 `app/api/` 아래로 분리.
- 한 라우트에서만 쓰는 컴포넌트는 해당 세그먼트의 `_components/`에, 두 곳 이상에서 쓰면 공용 위치로 올린다.

## 아키텍처 경계 — 규모가 커져도 유지되는 규칙

`app/`은 라우팅만 담당하고, 실제 도메인 로직은 기능 단위로 모은다.

```
src/
├── app/          # 라우팅 · 페이지 조립만
├── components/   # 도메인 무관 공용 UI
├── features/     # 도메인별 기능 (api, components, hooks, types, utils)
├── lib/          # 외부 라이브러리 래퍼 · 클라이언트 설정
├── hooks/ utils/ types/ config/
└── data/         # Data Access Layer (security.md 참조)
```

**단방향 의존.** 코드는 `shared → features → app` 한 방향으로만 흐른다. `features/`는 `app/`을 import하지 않고, `app/`은 `features/`의 공개 진입점만 쓴다.

**기능 간 직접 import 금지.** `features/billing`이 `features/auth`를 import하지 않는다. 필요하면 `app/` 레벨에서 조립한다. 이 규칙은 사람이 지키는 게 아니라 ESLint `import/no-restricted-paths`로 강제한다 — 강제하지 않으면 반드시 무너진다.

**배럴 파일(`index.ts` 재export) 금지.** 트리 셰이킹을 방해하고 빌드가 느려진다. 파일을 직접 import한다.

**절대 경로 import.** `tsconfig.json`에 `@/* → ./src/*`를 설정하고 `@/features/auth/...`로 쓴다. `../../../`는 금지.

- TODO(프로젝트별로 작성) — 위 구조에서 벗어나는 예외가 있다면 여기에 이유와 함께

## Server / Client 경계 — 가장 자주 깨지는 규칙

**기본은 서버 컴포넌트다.** `'use client'`는 필요할 때만, 트리의 **잎에 가깝게** 붙인다. 레이아웃이나 페이지 최상단에 붙이면 그 아래 전체가 클라이언트 번들로 들어간다.

`'use client'`가 필요한 경우는 이 셋뿐이다: React 훅(`useState`, `useEffect` 등), 이벤트 핸들러(`onClick` 등), 브라우저 API(`window`, `localStorage`).

| 금지 | 이유 / 대신 |
|---|---|
| `'use client'` + `async function` 컴포넌트 | 클라이언트 컴포넌트는 async일 수 없다. 부모 서버 컴포넌트에서 fetch해서 props로 내린다. |
| 클라이언트 컴포넌트에 함수 prop 전달 | 직렬화 불가. 클라이언트 안에서 정의하거나 서버 액션(`'use server'`)으로 넘긴다. |
| `Date` 객체 전달 | 문자열로 변질돼 `.getFullYear()`에서 런타임 에러. 서버에서 `.toISOString()`으로 넘기고 클라이언트에서 `new Date()`. |
| `Map`/`Set`/클래스 인스턴스 전달 | 메서드가 사라진다. 평범한 객체·배열로 변환해서 넘긴다. |

서버 액션은 예외다 — `'use server'`가 붙은 함수는 클라이언트 컴포넌트에 prop으로 전달할 수 있다.

## Data Fetching & Mutations

읽기와 쓰기의 기본 선택지가 다르다. 이 표를 벗어나려면 이유를 코드에 남긴다.

| 상황 | 사용할 것 |
|---|---|
| 서버 컴포넌트에서 읽기 | DB/외부 API를 **직접** 호출. 내부용 API 라우트를 만들지 않는다. |
| UI에서 발생하는 변경(폼 제출, 삭제) | 서버 액션. 변경 후 `revalidatePath()` / `revalidateTag()` 호출. |
| 외부에서 들어오는 요청(웹훅, 모바일 앱, 공개 REST) | Route Handler (`app/api/*/route.ts`) |
| 클라이언트 컴포넌트가 데이터 필요 | 서버 컴포넌트에서 props로 내리는 것이 1순위 |

**워터폴 금지.** 서로 의존하지 않는 fetch를 순차로 `await`하지 않는다.

```tsx
// Bad — 순차 대기
const user = await getUser()
const posts = await getPosts()

// Good — 병렬
const [user, posts] = await Promise.all([getUser(), getPosts()])

// Good — 느린 부분만 스트리밍
<Suspense fallback={<PostsSkeleton />}><PostsSection /></Suspense>
```

- 요청 단위 중복 호출 제거는 `import { cache } from 'react'`로 감싼다.
- 비밀 값(API 키, DB 접속 정보)은 서버 컴포넌트·서버 액션·Route Handler 밖으로 나가지 않는다. `NEXT_PUBLIC_` 접두사는 **브라우저에 그대로 노출**되므로 공개해도 되는 값에만 쓴다.

## Async APIs (Next.js 15+)

`params`, `searchParams`, `cookies()`, `headers()`는 전부 비동기다. 타입도 `Promise<...>`로 쓴다.

```tsx
type Props = { params: Promise<{ slug: string }> }

export default async function Page({ params }: Props) {
  const { slug } = await params
}
```

동기 컴포넌트에서는 `use(params)`를 쓴다. 구버전 코드 마이그레이션은 `npx @next/codemod@latest next-async-request-api .`

## Routing 부가 규칙

- 미들웨어 파일명은 버전에 따라 다르다. **v14–15**: `middleware.ts` / `middleware()` / `config`. **v16+**: `proxy.ts` / `proxy()` / `proxyConfig`. 프로젝트 버전에 맞는 쪽만 쓴다.
- 런타임은 **Node.js 기본**을 쓴다. `export const runtime = 'edge'`는 이미 프로젝트가 Edge를 쓰고 있거나 명확한 지연시간 요구가 있을 때만 — Edge는 `fs`가 없고 `crypto`가 제한되며 상당수 npm 패키지가 동작하지 않는다.
- `'use cache'`는 `next.config.ts`에 `cacheComponents: true`가 켜져 있을 때만 쓴다.

## Rendering 기본기

- `<img>` 대신 `next/image`. LCP 이미지에는 `priority`, 반응형에는 `sizes`를 지정한다.
- 폰트는 `next/font`로 로드한다. `<link>`로 외부 폰트를 불러오지 않는다.
- 서드파티 스크립트는 `next/script`. 인라인 스크립트에는 `id`가 필요하다.
- 하이드레이션 에러는 무시하지 않는다. 원인은 대개 셋 중 하나다: 렌더 중 브라우저 API 접근, 서버/클라이언트에서 다른 시각·난수, 잘못된 HTML 중첩(`<p>` 안의 `<div>` 등).

## Forms & Validation

- 스키마는 zod 등으로 **한 번만 정의하고 서버·클라이언트가 공유한다.** 검증 로직을 두 벌 쓰면 반드시 어긋난다.
- 클라이언트 검증은 UX용이다. 서버에서 반드시 다시 검증한다 (`.claude/docs/security.md`).
- 예상 가능한 에러(검증 실패, 중복 이메일)는 **예외가 아니라 반환값으로** 모델링하고 `useActionState`로 클라이언트에 전달한다. `try/catch`는 예상 못 한 에러용이다.
- TODO(프로젝트별로 작성) — 검증 라이브러리, 폼 라이브러리, 에러 메시지 규칙

## Error Handling

- 실패 조건은 함수 **앞부분**에서 처리하고 early return한다. 정상 경로(happy path)를 마지막에 둔다. 중첩된 `if`와 불필요한 `else`를 만들지 않는다.
- 에러를 삼키지 않는다. `catch`에서 처리하지 않을 에러는 다시 던진다.
- `redirect()`나 `notFound()`를 감쌀 수 있는 `catch` 블록에서는 `unstable_rethrow(error)`(from `next/navigation`)를 먼저 호출한다 — 이 함수들은 내부적으로 예외를 던져 동작하므로, 그냥 잡으면 리다이렉트가 조용히 사라진다.
- 세그먼트 단위 에러 UI는 `error.tsx`(`'use client'` 필수), 루트는 `global-error.tsx`.
- 흐름 제어는 전용 함수로: `redirect()`, `permanentRedirect()`, `notFound()`, `forbidden()`, `unauthorized()`.
- TODO(프로젝트별로 작성) — 도메인 에러 타입, 로깅 대상

## Dependencies

- 락파일(`package-lock.json` / `pnpm-lock.yaml`)은 반드시 커밋한다. 없으면 매 설치마다 다른 트리가 만들어진다.
- 의존성 추가 전에 이미 있는 것으로 되는지 확인한다. 한 줄짜리 유틸을 위해 패키지를 넣지 않는다.
- TODO(프로젝트별로 작성) — 패키지 매니저와 Node 버전 고정 방법

## Git & Commits

- 커밋 하나에 논리적 변경 하나. 리팩터링과 기능 추가를 같은 커밋에 섞지 않는다.
- 커밋 메시지는 무엇을 했는지가 아니라 **왜 했는지**를 남긴다. diff가 무엇을 했는지는 이미 보여준다.
- TODO(프로젝트별로 작성) — 커밋 메시지 규약(예: Conventional Commits `feat:`/`fix:`), 브랜치 전략, PR 크기 기준

## 팀이 정할 것 (표준이 아니라 취향)

<!-- 아래는 커뮤니티에서 의견이 갈리는 항목들이다. 정답이 없으므로 팀이 하나를 고르고 여기 적는다.
     고르기만 하면 되고, 무엇을 고르는지는 대체로 중요하지 않다. 안 고르면 리뷰에서 매번 논쟁이 난다. -->

| 항목 | 선택 |
|---|---|
| 컴포넌트 선언 (`function` vs `const`) | TODO |
| export 방식 (named vs default) | TODO |
| 타입 정의 (`interface` vs `type`) | TODO |
| 세미콜론 | TODO(포매터 설정으로 강제) |
| 테스트 파일 위치 (동일 폴더 vs `__tests__`) | TODO(`testing.md`와 일치시킬 것) |
| 스타일링 방식 (Tailwind / CSS Modules / 기타) | TODO(`design-guide.md`와 일치시킬 것) |
