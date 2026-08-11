<!-- 프로젝트 코딩 컨벤션. 반복해서 지적하게 되는 규칙은 전부 여기에 적으세요.
     아래 Next.js 규칙은 프레임워크 표준이므로 그대로 두고, TODO 항목만 프로젝트에 맞게 채우면 됩니다.
     Next.js를 쓰지 않는 프로젝트라면 "Next.js" 섹션들을 통째로 삭제하세요. -->

# Coding Conventions — <PROJECT_NAME>

**스택:** Next.js `TODO(버전 — 예: 16.x)` · App Router · TypeScript
<!-- 버전이 중요합니다. v15와 v16은 미들웨어 파일명과 캐싱 규칙이 다릅니다. -->

## Language & Formatting

- TypeScript strict mode. `any` 금지 — 모르면 `unknown`으로 받고 좁힌다.
- 커밋 전 `TODO(예: npm run lint && npx tsc --noEmit)` 통과 필수.
- TODO(프로젝트별로 작성) — 포매터(Prettier/Biome)와 실행 명령

## Naming

- 라우트 폴더는 URL 그대로 `kebab-case`. 특수 파일명(`page.tsx`, `layout.tsx`, `route.ts`)은 Next.js가 정한 이름이므로 변경 불가.
- 컴포넌트는 `PascalCase`, 훅은 `useCamelCase`, 서버 액션은 동사로 시작(`createPost`, `deleteUser`).
- 라우팅에서 제외할 폴더는 `_` 접두사(`app/_components/`). 괄호 폴더 `(group)/`는 URL에 영향이 없다.
- TODO(프로젝트별로 작성) — 그 외 파일명 규칙, boolean 접두사(`is*`/`has*`) 등

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
- TODO(프로젝트별로 작성) — 공용 컴포넌트/유틸/타입의 위치 (`components/`, `lib/`, `types/` 등)

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

## Error Handling

- 에러를 삼키지 않는다. `catch`에서 처리하지 않을 에러는 다시 던진다.
- `redirect()`나 `notFound()`를 감쌀 수 있는 `catch` 블록에서는 `unstable_rethrow(error)`(from `next/navigation`)를 먼저 호출한다 — 이 함수들은 내부적으로 예외를 던져 동작하므로, 그냥 잡으면 리다이렉트가 조용히 사라진다.
- 세그먼트 단위 에러 UI는 `error.tsx`(`'use client'` 필수), 루트는 `global-error.tsx`.
- 흐름 제어는 전용 함수로: `redirect()`, `permanentRedirect()`, `notFound()`, `forbidden()`, `unauthorized()`.
- TODO(프로젝트별로 작성) — 도메인 에러 타입, 로깅 대상

## Git & Commits

- TODO(프로젝트별로 작성) — e.g. Conventional Commits (`feat:`, `fix:`); one logical change per commit
