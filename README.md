# blueplan

문서화 기반 · 단계별 · TDD 우선 개발 워크플로우를 위한 Claude Code 플러그인.

## 철학

**문서가 세션 간 공유 메모리다.** Claude 세션은 컨텍스트가 끝나면 모든 것을 잊지만, `docs/`와 `.claude/docs/`는 남는다. blueplan은 모든 기능 작업을 "다른 세션이 이어받을 수 있는 문서"로 만들어, 어떤 세션이든 플랜 파일 하나만 읽고 작업을 이어갈 수 있게 한다.

- 기능마다 **스텝별 플랜 문서**(`docs/plans/NNN-*.md`)를 만들고, 사용자 승인 후에만 실행
- 스텝 완료마다 **구현 노트**를 플랜에 기록 → 다음 스텝(다른 세션 포함)이 컨텍스트를 이어받음
- 실제 구현은 **서브에이전트에 위임** (오케스트레이터는 검증과 기록만)
- **TDD 강제**: 테스트 먼저 → 실패 확인 → 구현. 실패 출력 없는 작업 보고는 반려
- CLAUDE.md에 다 못 넣는 컨벤션/디자인가이드는 `.claude/docs/`로 분리, `INDEX.md` 라우팅 표로 작업 유형에 맞는 문서만 로드

## 설치

```
/plugin marketplace add yuki-devio/blueplan
/plugin install blueplan@blueplan-marketplace
```

## 업데이트

두 단계다. 마켓플레이스 메타데이터를 먼저 갱신하고, 그다음 플러그인을 올린다.

```
/plugin marketplace update blueplan-marketplace
/plugin update blueplan
```

적용하려면 **Claude Code를 재시작**해야 한다 (스킬은 세션 시작 시 로드된다).

첫 줄을 건너뛰면 안 된다. 마켓플레이스는 저장소 사본을 캐시하므로, 갱신하지 않으면 `/plugin update`가 캐시된 옛 버전을 보고 "이미 최신"이라고 답한다. 스킬을 고쳤는데 반영이 안 된다면 대개 이 두 가지 — `marketplace update` 누락, 또는 재시작 안 함 — 중 하나다.

터미널에서 직접:

```bash
claude plugin marketplace update blueplan-marketplace
claude plugin update blueplan
claude plugin list          # 설치된 버전 확인
```

## 시작하기

프로젝트 루트에서:

```
/blueplan:init
```

다음 구조가 스캐폴딩된다 (기존 파일은 절대 덮어쓰지 않음):

```
docs/
├── architecture.md      # 시스템 구조 (현재형 유지)
├── prd.md               # 제품 목표 + 기능 레지스트리
├── adr/000-adr-template.md
└── plans/               # 기능별 스텝 플랜
.claude/docs/
├── INDEX.md             # 작업 유형 → 문서 라우팅 표
├── conventions.md       # 코딩 컨벤션 (Next.js App Router + 아키텍처 표준 룰 탑재)
├── security.md          # 데이터 보안 룰 (DAL, 서버액션 인가, 입력 검증)
├── design-guide.md      # 디자인 규칙
└── testing.md           # 테스트 명령·정책 (플랜의 test_command 원본)
```

`.claude/docs/`의 TODO 항목들을 프로젝트 규칙으로 채우면 이후 모든 작업에서 자동으로 참조된다.

## 워크플로우

```
init (1회) → 문서화 (상시) → 기능 플랜 작성 → 스텝 실행 루프 → 문서 갱신
                                              (TDD·참조 라우팅은 항상 적용)
```

1. **플랜**: "OO 기능 플랜 짜줘" → `planning-features`가 `docs/plans/NNN-*.md` 작성 → 검토·승인
2. **실행**: "구현 시작해줘" / "이어서 해줘" → `executing-steps`가 스텝별로 서브에이전트 디스패치 → 테스트 직접 실행으로 검증 → 구현 노트 기록
3. **재개**: 새 세션에서 "플랜 이어서 진행해줘"만 하면 플랜 파일의 상태와 노트로 그대로 이어감

## 스킬 목록

| 스킬 | 언제 발동 | 하는 일 |
|------|-----------|---------|
| `using-blueplan` | blueplan 언급, 어디서부터 할지 모를 때 | 라이프사이클 안내, 스킬 라우팅 |
| `initializing-blueplan` | 초기화/세팅 요청 | docs/·.claude/docs/ 스캐폴딩, CLAUDE.md 연결 |
| `documenting-projects` | 아키텍처 변경, 의사결정, PRD 갱신 | architecture/PRD/ADR 유지 |
| `planning-features` | 기능 플랜 필요 시 | 스텝별 플랜 문서 작성 (Stranger Test) |
| `executing-steps` | 플랜 실행/재개 | 서브에이전트 디스패치 → 검증 → 구현 노트 기록 |
| `enforcing-tdd` | 모든 구현 코드 작성 전 | RED→GREEN→REFACTOR 강제 |
| `consulting-references` | 코딩/디자인/테스트 작업 전 | INDEX.md 라우팅으로 참조 문서 로드 |
| `reporting-progress` | 스텝 완료 시 자동, "뭐 만들었어?" | 플랜별 HTML 리포트 생성 — 다이어그램·기술·실행된 명령어 |
| `reporting-tests` | 테스트 코드 작성·수정 직후 자동, "어디까지 테스트했어?" | 테스트 대시보드 생성 — 파일별 검증 범위·경계·실행 결과 |
| `auditing-permissions` | "권한 검사해줘", 위험 점검 요청 시 | AI의 실효 권한·위험도·해결방안을 md 리포트로 정리 (읽기 전용) |

## 구현 리포트

플랜 문서는 다음 에이전트가 읽기 좋게 돼 있지, 사람이 "뭘 만들었는지" 파악하기엔 불편하다. `executing-steps`는 스텝을 하나 끝낼 때마다 `docs/plans/NNN-*.html`을 다시 렌더링한다 — 브라우저로 열면 되는 자체 완결 페이지 하나다.

담기는 것:

- **동작 다이어그램** — 실제 모듈·라우트 이름으로 그린 데이터 흐름 (mermaid, 오프라인이면 소스가 그대로 보이는 폴백)
- **스텝 의존 그래프** — 상태별 색상
- **사용된 기술** — 무엇을 어디에 왜 썼는지
- **스텝별 실행된 쉘 명령어** — 명령어 · 종류 · 무엇을 하는가 · 결과

명령어는 네 종류로 분류된다. 🔍 조회(상태만 읽음) · ▶️ 실행(코드를 돌림) · 📝 변경(되돌릴 수 있음) · ⚠️ 파괴(되돌리기 어려움). ⚠️가 하나라도 있으면 리포트 최상단에 경고가 뜬다 — 열자마자 보여야 하는 정보이기 때문이다.

명령어 기록은 구현 서브에이전트가 보고하고 오케스트레이터가 플랜에 옮긴다. 나중에 복원할 수 없으므로, 누락되면 `none`으로 적지 않고 다시 물어본다. 리포트는 플랜 문서의 렌더링일 뿐이며, 플랜에 없는 사실은 리포트에도 쓰지 않는다.

## 테스트 리포트

테스트 코드는 러너가 읽으라고 쓴 것이지, 사람이 "무엇을 어디까지 보장하는지" 알아보라고 쓴 게 아니다. 테스트 파일이 추가·수정되면 `reporting-tests`가 `docs/tests/index.html` 한 장을 갱신한다. 플랜 없이 테스트만 쓴 경우에도 동작한다.

담기는 것:

- **테스트 지도** — 어떤 테스트 파일이 어떤 소스 모듈을 검증하는지. 테스트가 없는 모듈은 회색 점선으로 표시된다
- **파일별 카드** — 테스트 파일로 가는 링크 · 케이스 표(테스트 이름 → **어떤 동작을 규정하는가** → 결과 → 소요) · 이 파일만 돌리는 명령
- **어디까지 보나 / 여기는 안 보나** — 모킹으로 대체된 것, 스킵된 케이스, 단언이 없는 분기. 커버리지 숫자보다 이쪽이 실제 정보다
- **실패 상세** — 실패 출력 원문과 그것이 무슨 뜻인지
- **테스트가 없는 곳** — 비어 있는 소스 모듈 목록

결과 칸은 스킬이 `.claude/docs/testing.md`의 명령을 **실제로 실행해서** 채운다. 돌리지 않았으면 `⏳ 미실행`으로 남고, 통과로 추측해 적지 않는다 — 보호받지 않는 코드를 보호받는다고 표시하는 것이 빈칸보다 나쁘기 때문이다.

## 안전장치 (훅)

blueplan을 설치하면 `PreToolUse` 훅이 자동으로 켜진다. 스킬과 달리 훅은 **모델이 판단하지 않는다** — 프로세스가 도구 호출을 가로채서 차단하므로, `defaultMode`가 `bypassPermissions`여도, 세션을 `--dangerously-skip-permissions`로 띄웠어도 동작한다.

**막는 것 1 — 시크릿 파일 읽기**

`.env`, `.env.local`, `*.pem`, `id_rsa`, `~/.aws/**`, `~/.ssh/**`, `~/.npmrc`, `.git-credentials`, `serviceAccount*.json` 등. `Read`·`Grep`·`Glob` 도구는 물론 `cat .env` 같은 셸 우회도 막는다. `.env.example`·`.env.sample`은 값이 없는 템플릿이므로 허용한다.

**막는 것 2 — 되돌릴 수 없는 명령**

```
rm (전부)          git reset --hard       git clean -fdx
git push --force   git push --delete      git checkout -- .
supabase db reset  prisma migrate reset   DROP/TRUNCATE TABLE
FLUSHALL           docker compose down -v docker system prune
kubectl delete     mkfs / dd of=          curl … | sh
```

명령 연결(`npm test && rm -rf build`), 래퍼(`sudo rm`, `xargs rm`), 환경변수 접두(`FOO=1 rm`), 서브셸(`$(...)`)을 벗겨서 검사한다.

**설정** — 프로젝트 루트에 `.claude/blueplan-guard.json`:

```json
{
  "enabled": true,
  "allowCommands": ["rm -rf .next", "rm -rf dist"],
  "allowPaths": [".env.example"],
  "denyCommands": ["^fly deploy"]
}
```

한 세션만 끄려면 `BLUEPLAN_GUARD=off`.

**한계 — 과신하지 말 것.** 이 훅은 **사고**를 막는 장치이지 공격자를 막는 장치가 아니다. 문자열을 조립하거나(`$(echo rm) -rf`), base64로 인코딩하거나, 인터프리터를 경유하면 통과한다. 또 가드가 예외로 죽으면 **통과시킨다**(fail-open) — 가드 버그가 작업을 멈추게 하는 쪽이 더 나쁘기 때문이다. 진짜 방어는 자격증명을 로컬에 두지 않는 것이고, 이 훅은 그 위에 얹는 한 겹이다.

알려진 오탐 하나: `echo 'curl x | sh'`처럼 위험한 문자열을 따옴표 안에 넣어도 차단된다. `psql -c 'DROP TABLE users'`를 잡으려면 따옴표 안을 봐야 하는데, 그러면 진짜 위험한 쪽을 놓친다. 놓치는 것보다 낫다고 판단했다.

## 권한 감사

"git 푸시해줘", "DB 정리해줘"라고 말할 때 **AI에게 실제로 어떤 권한이 있는지** 모르는 게 바이브코딩의 가장 큰 위험이다. 권한은 Claude Code 설정 3계층 · MCP 서버 · `.env` · CLI 로그인 상태 · git 원격 인증에 흩어져 있어서 한 곳만 봐서는 알 수 없다.

```
"권한 검사해줘"  →  auditing-permissions
```

산출물 2개:

- `docs/security/permission-audit-YYYY-MM-DD.md` — 리소스별 **읽기/생성/수정/삭제 능력 매트릭스**, 위험 항목마다 `file:line` 근거 · 최악의 시나리오 · 복사 가능한 해결방안 · 되돌리는 법 · 확인하지 못한 것
- `.claude/docs/permissions.md` — 이후 세션이 매번 읽는 짧은 경계 문서

검사 범위: Claude Code 권한(`allow`/`deny`/`defaultMode`/hooks/MCP/플러그인) · 파일시스템·git·GitHub 토큰 스코프 · Supabase(anon vs service_role, RLS 우회, `NEXT_PUBLIC_` 노출, MCP read-only 여부) · Prisma/Drizzle/Postgres/Redis · AWS/GCP/Vercel/kubectl 컨텍스트/SSH · 외부 전송 경로 · npm publish·postinstall.

**감사기는 읽기 전용이다.** 화이트리스트에 있는 상태 조회 명령만 실행하고, 시크릿 값은 기록하지 않으며(이름 + 앞 4자 + 길이만), 산출물 2개 외에는 어떤 파일도 수정하지 않는다. `.claude/docs/INDEX.md` 한 줄 추가만 사용자에게 물어본다.

## 플랜 문서 구조 (요약)

```markdown
--- frontmatter: status / current_step / references / test_command ---
## Context        ← 제로 컨텍스트 독자용
## Step Index     ← 스텝별 상태 표
## Step N
  Status / Depends on / Goal / Files / Test Spec / Guidance / Acceptance Criteria
  Implementation Notes   ← 실행 시 기록: 한 것·파일·결정·주의점·테스트 증거
```

스텝별 `Status:` 라인이 진실이며, 새 세션은 의존성이 모두 done인 첫 pending 스텝부터 이어간다.

## FAQ

**Q. 다른 세션에서 어떻게 이어받나요?**
플랜 파일이 유일한 상태 저장소다. "docs/plans/003 이어서 해줘"라고만 하면 된다.

**Q. superpowers 플러그인과 같이 써도 되나요?**
가능하다. 단, blueplan을 쓰는 프로젝트에서는 플랜/실행 워크플로우를 blueplan 스킬로 통일할 것 (플랜 형식이 섞이면 안 됨).

**Q. 스킬이 자동으로 발동 안 하면?**
"blueplan으로 진행해줘"라고 명시하거나 `/blueplan:init`으로 시작하면 된다. init이 CLAUDE.md에 넣는 포인터 블록도 발동을 돕는다.

## 라이선스

MIT
