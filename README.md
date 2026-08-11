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
| `auditing-permissions` | "권한 검사해줘", 위험 점검 요청 시 | AI의 실효 권한·위험도·해결방안을 md 리포트로 정리 (읽기 전용) |

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
