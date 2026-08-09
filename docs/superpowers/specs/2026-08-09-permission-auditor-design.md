# blueplan:auditing-permissions — 설계 문서

작성일: 2026-08-09
상태: 승인됨

## 문제

바이브코딩을 하는 사람은 "git 커밋해줘", "푸시해줘", "DB 정리해줘"라고 말하면서
**AI에게 실제로 어떤 권한이 주어져 있는지 모른다.** 그래서 의도치 않은 데이터 삭제,
라이브 서버 다운, 자격증명 유출이 일어나도 사전에 알아챌 방법이 없다.

권한은 여러 계층(Claude Code settings 3계층, MCP 서버, .env, 클라우드 CLI 로그인 상태,
git remote 인증)에 흩어져 있어서, 한 곳을 봐서는 실효 권한을 알 수 없다.

## 해결

프로젝트를 감사해서 **"지금 이 AI가 무엇을 읽고/만들고/고치고/지울 수 있는지"**를
리소스별·동작별로 나눈 표와, 위험 항목별 근거·최악 시나리오·해결방안을 담은
마크다운 리포트를 생성하는 스킬.

## 결정 사항

| 항목 | 결정 | 근거 |
|---|---|---|
| 배치 | blueplan 플러그인 내 `skills/auditing-permissions/` | 안전장치가 개발 워크플로우의 일부가 됨 |
| 검사 방식 | 정적 분석 + 읽기전용 프로브 | 설정만 봐서는 "이 키가 진짜 살아있는지" 모름 |
| 산출물 | 리포트 + 경계문서 2개 | 감사가 일회성으로 끝나지 않고 이후 세션을 구속 |
| 조치 범위 | **리포트만. 어떤 기존 파일도 수정하지 않음** | 감사기 자체가 사고칠 여지 0 |
| INDEX.md 등록 | 사용자에게 물어보고 승인 시에만 한 줄 추가 | 유일한 기존 파일 수정 예외 |
| 발동 | 사용자가 명시적으로 요청할 때만 | 자동 발동은 노이즈 |

## 구조

```
skills/auditing-permissions/
├── SKILL.md                     # 발동조건 · 6단계 절차 · 안전규칙 · 프로브 화이트리스트
├── references/
│   ├── checks-claude-code.md    # settings 3계층, hooks, MCP, 플러그인, defaultMode
│   ├── checks-local.md          # 파일시스템, git, GitHub CLI
│   ├── checks-database.md       # Supabase 상세 + Prisma/Drizzle/Postgres/Redis
│   └── checks-remote.md         # 클라우드 자격증명, k8s/ssh, 배포, 외부전송, 공급망
└── templates/
    ├── audit-report.md          # docs/security/permission-audit-YYYY-MM-DD.md 포맷
    └── permissions-boundary.md  # .claude/docs/permissions.md 포맷
```

`references/`를 분리하는 이유: 2단계 인벤토리에서 감지된 기술에 해당하는 파일만 읽는다.
Supabase 안 쓰는 프로젝트는 `checks-database.md`를 읽지 않는다.

## 절차 (SKILL.md)

1. **스코프 확정** — 프로젝트 루트 확인. "이 프로젝트가 프로덕션에 연결돼 있나요?" 질문
2. **인벤토리(정적)** — 설정·자격증명·의존성 감지 → 읽을 `references/` 결정
3. **도메인 검사** — 해당 references만 읽고 체크 수행
4. **읽기전용 프로브** — SKILL.md의 화이트리스트에 있는 명령만 실행. 없으면 "미확인" 기록
5. **능력 매트릭스 조립 + 위험등급 산정**
6. **리포트 2개 작성** → 터미널 요약 출력

## 검사 도메인

| 도메인 | 핵심 확인 |
|---|---|
| Claude Code 자체 | `permissions.allow/deny/ask` 3계층 병합 결과, `defaultMode`, `additionalDirectories`, hooks(임의 코드 실행), MCP 서버가 붙인 툴, 설치된 플러그인 |
| 파일시스템 | `rm` 허용 여부, 작업디렉토리 밖 쓰기, `~/.ssh` `~/.aws` `~/.npmrc` `.netrc` 접근 |
| Git/GitHub | remote 대상, 인증 방식, `gh auth status` 스코프, force push·hard reset·브랜치 삭제 허용, 브랜치 보호 |
| Supabase | anon vs service_role 키 구분(RLS 전면 우회), `NEXT_PUBLIC_`에 service_role 노출, linked project가 프로덕션인지, `db reset`/`db push`, Supabase MCP의 read-only 여부와 `execute_sql` 노출, RLS 활성화 |
| 기타 DB | `DATABASE_URL` 계정 권한, `prisma migrate reset`, `drizzle-kit push`, Redis `FLUSHALL` |
| 클라우드/배포 | AWS/GCP/Azure 자격증명과 신원, kubectl 현재 컨텍스트가 프로덕션인지, `vercel --prod`, ssh 키, pm2/systemctl |
| 네트워크 유출 | WebFetch/curl 허용, MCP의 외부 전송, 하드코딩 웹훅, 텔레메트리 |
| 공급망 | `npm publish` 권한, `.npmrc` 토큰, postinstall 스크립트 |

## 리포트 포맷

### 1) 능력 매트릭스 (맨 앞, 평이한 한국어)

| 리소스 | 읽기 | 생성 | 수정 | 삭제/파괴 | 승인 필요? | 근거 |
|---|---|---|---|---|---|---|
| 프로젝트 파일 | ✅ | ✅ | ✅ | ✅ | ❌ 없음 | `settings.local.json:8` `Bash(rm:*)` |
| Supabase prod 테이블 | 🔴 전체 | 🔴 | 🔴 | 🔴 RLS 무시 | ❌ 없음 | `.env.local`의 SERVICE_ROLE_KEY |

### 2) 발견 항목 (위험도 순)

각 항목은 고정 5개 블록: **무엇을 할 수 있나 / 어디에 있나(파일:줄) / 최악의 시나리오 /
해결방안(강한 순서, 복사 가능한 스니펫) / 되돌리는 법**.

### 3) 확인하지 못한 것

프로브 실패·접근 불가 항목을 정직하게 나열. 조용한 누락 없음.

## 위험 등급

| 등급 | 정의 |
|---|---|
| 🔴 CRITICAL | 되돌릴 수 없는 데이터/서비스 손실이 **승인 프롬프트 없이** 가능 |
| 🟠 HIGH | 되돌릴 수 없지만 승인은 뜸 / 자격증명 유출 경로 존재 |
| 🟡 MEDIUM | 영향은 있으나 복구 가능 |
| 🟢 INFO | 알아둘 것 |

## 안전 규칙 (강제)

- 화이트리스트 밖 명령 실행 금지. 쓰기·삭제·배포·마이그레이션 계열 **절대 실행 안 함**
- **시크릿 값 전문 기록 금지** — 키 이름 + 접두사 4자 + 길이만
- 리포트 상단에 "이 문서는 취약점 지도다. 공개 repo면 커밋하지 말 것" 경고 삽입
- 감사 결과를 외부로 전송하지 않음
- 산출물 2개 외 어떤 파일도 수정하지 않음 (INDEX.md는 사용자 승인 시에만)

## 범위 밖 (YAGNI)

- 실시간 차단 훅 설치 — 해결방안으로 안내만 하고 설치는 안 함
- 자동 권한 잠금 — 사용자가 명시적으로 거부
- 스캔 스크립트 동봉 — 플러그인에 실행 코드를 넣지 않음
- CI 연동 / 정기 감사 — 사용자 요청 시에만 발동
