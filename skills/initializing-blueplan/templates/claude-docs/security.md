<!-- 데이터 보안 규칙. 인증·권한·DB·서버액션·API를 건드리는 작업 전에 반드시 읽습니다.
     출처: Next.js 공식 "How to think about data security in Next.js" (v16 기준).
     Next.js를 쓰지 않는 프로젝트라면 App Router 관련 항목을 삭제하고 나머지 원칙만 남기세요. -->

# Data Security — <PROJECT_NAME>

RSC는 데이터 접근 위치를 바꾸기 때문에, 기존 프론트엔드의 보안 가정이 그대로 통하지 않는다.
아래는 권고가 아니라 이 프로젝트의 구속력 있는 규칙이다.

## 대원칙

**서버 액션과 Route Handler는 공개 HTTP 엔드포인트다.** `'use server'` 함수는 UI를 거치지 않고
직접 POST로 호출될 수 있다. TypeScript 타입, 클라이언트 검증, 컴포넌트 경계는 전부 **내 코드만**
제약할 뿐 공격자에게는 아무 제약이 아니다. `curl`로 임의 페이로드를 던지는 상대를 가정하고 작성한다.

## 데이터 접근 방식은 하나로 통일한다

프로젝트당 하나만 고르고 섞지 않는다. 섞이면 개발자도 감사자도 무엇을 기대해야 할지 알 수 없다.

| 방식 | 적합한 상황 |
|---|---|
| 기존 HTTP API 호출 (Zero Trust) | 이미 백엔드 API와 보안 체계가 있는 조직 |
| **Data Access Layer (DAL)** | 신규 프로젝트 — 기본값 |
| 서버 컴포넌트에서 직접 쿼리 | 프로토타입·학습용. 프로덕션에는 쓰지 않는다. |

이 프로젝트가 채택한 방식: `TODO(하나만 적으세요)`

## Data Access Layer 규칙

DAL은 서버 전용 내부 라이브러리이며, 다음을 **전부** 만족해야 한다.

- 서버에서만 실행된다 — 파일 최상단에 `import 'server-only'`
- 인가(authorization) 검사를 수행한다
- 원본 레코드가 아니라 **최소한의 DTO**를 반환한다
- `process.env`에 접근하는 것은 DAL뿐이다. 다른 어디에서도 시크릿을 읽지 않는다.

```ts
// data/posts.ts
import 'server-only'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function deletePost(postId: string) {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')

  const post = await db.post.findUnique({ where: { id: postId } })
  if (post.authorId !== session.user.id) throw new Error('Forbidden')  // 소유권 확인

  await db.post.delete({ where: { id: postId } })
}
```

서버 액션은 얇게 유지하고 DAL에 위임한다.

```ts
// app/actions.ts
'use server'
import { deletePost } from '@/data/posts'
import { revalidatePath } from 'next/cache'

export async function deletePostAction(postId: string) {
  await deletePost(postId)   // 인증·인가는 DAL 안에서
  revalidatePath('/posts')
}
```

사용자 조회는 `cache()`로 감싸 요청 내 어디서든 다시 읽게 한다. 서버 컴포넌트끼리 사용자 객체를
전달하지 않는다 — 전달하다 보면 클라이언트 컴포넌트까지 흘러간다.

## 서버 액션 체크리스트

모든 `'use server'` 함수는 아래를 전부 통과해야 한다. 하나라도 빠지면 머지하지 않는다.

- [ ] **인증을 액션 안에서 다시 확인했다.** 페이지의 인증 검사는 액션에 상속되지 않는다. 페이지의 `redirect()`는 어떤 UI를 그릴지 정할 뿐, 액션은 별개의 진입점이다.
- [ ] **인가를 확인했다.** 로그인 여부(authentication)와 이 리소스를 다룰 권한(authorization)은 다르다. 리소스 소유권을 검사하지 않으면 IDOR 취약점이 된다.
- [ ] **입력을 검증했다.** `FormData`, `searchParams`, `params`, 헤더, 쿠키는 전부 신뢰할 수 없는 입력이다. zod 등 스키마로 검증한다. **스키마 통과는 인가가 아니다** — 형식이 올바른 값도 남의 행을 가리킬 수 있다.
- [ ] **반환값을 통제했다.** 반환값은 직렬화되어 클라이언트로 간다. DB 레코드를 그대로 반환하지 않고 UI에 필요한 것만 돌려준다.
- [ ] **비싼 작업에는 레이트 리밋을 걸었다.** 메일 발송, 외부 API 호출, 대량 쓰기.

## 클라이언트로 넘기지 말아야 할 것

- 서버 컴포넌트에서 클라이언트 컴포넌트로 **원본 DB 레코드를 통째로 넘기지 않는다.** 필요한 필드만 골라서 넘긴다. props 타입이 넓으면(`user: User`) 넘기는 쪽도 다 넘기게 된다.
- `NEXT_PUBLIC_` 접두사가 붙은 환경변수는 **브라우저 번들에 그대로 들어간다.** 공개해도 되는 값에만 쓴다.
- 서버 전용 모듈에는 `import 'server-only'`를 붙인다. 클라이언트에서 import되면 빌드가 실패한다.
- 추가 방어층이 필요하면 React Taint API(`experimental_taintObjectReference`, `experimental_taintUniqueValue`)를 `next.config.js`의 `experimental.taint: true`와 함께 쓴다. 단, 이건 보조 수단이고 DAL에서 걸러내는 것이 먼저다.

## 렌더 중 부수효과 금지

렌더링 중에 쿠키를 지우거나 DB를 바꾸거나 캐시를 무효화하지 않는다. GET 요청으로 상태가 바뀌면 CSRF 위험이 생긴다.

```tsx
// Bad — 렌더 중 변경
export default async function Page({ searchParams }) {
  if ((await searchParams).logout) (await cookies()).delete('AUTH_TOKEN')
}

// Good — 서버 액션으로
<form action={logout}><button type="submit">Logout</button></form>
```

같은 이유로, 신뢰할 수 없는 입력으로 권한을 판단하지 않는다. `searchParams.isAdmin === 'true'`
같은 코드는 URL만 고치면 뚫린다. 매번 쿠키/세션에서 다시 검증한다.

## 배포 관련

- 리버스 프록시나 다중 도메인 구성이면 `experimental.serverActions.allowedOrigins`에 안전한 오리진을 명시한다. 기본적으로 Next.js는 Origin과 Host 헤더를 비교해 다르면 요청을 거부한다.
- 여러 서버에 셀프호스팅한다면 `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`를 고정한다. 인스턴스마다 키가 달라지면 액션 호출이 불안정해진다.
- TODO(프로젝트별로 작성) — CSP 정책, 시크릿 보관 위치(호스팅 시크릿 vs `.env`), 키 로테이션 주기

## 코드 리뷰 시 집중해서 볼 곳

| 대상 | 확인할 것 |
|---|---|
| DAL | DB 패키지와 `process.env`가 DAL 밖에서 import되지 않는가 |
| `'use client'` 파일 | props가 비공개 데이터를 받고 있지 않은가. 타입이 과도하게 넓지 않은가 |
| `'use server'` 파일 | 인자 검증·재인가·소유권 확인·반환값 필터링이 다 있는가 |
| `app/[param]/` | 대괄호 폴더는 사용자 입력이다. 검증하는가 |
| `proxy.ts` / `middleware.ts` / `route.ts` | 권한이 크다. 별도로 시간을 들여 본다. |

미들웨어는 엣지 레벨 라우팅 판단용이며 **유일한 인증 수단이 될 수 없다.** 실제 검사는 항상 DAL이나 액션 안에서 한 번 더 한다.
