#!/usr/bin/env node
/**
 * blueplan guard — PreToolUse hook.
 *
 * 두 가지를 막는다:
 *   1) 시크릿 파일 읽기 (.env, 키, 자격증명)
 *   2) 되돌릴 수 없는 명령 실행 (rm, reset, force push, DB 초기화 …)
 *
 * 한계 (문서에도 같은 내용이 있다):
 *   - 이 훅은 **사고**를 막는 장치이지 공격자를 막는 장치가 아니다.
 *     의도적 우회(문자열 조립, base64, 인터프리터 경유)는 막지 못한다.
 *   - 파싱에 실패하거나 스크립트가 죽으면 **통과시킨다**(fail-open).
 *     가드가 세션을 망가뜨리는 쪽이 더 나쁘기 때문이다.
 *
 * 설정: <cwd>/.claude/blueplan-guard.json  (없으면 기본값)
 *   { "enabled": true,
 *     "allowCommands": ["rm -rf .next"],   // 이 문자열로 시작하면 허용
 *     "allowPaths": [".env.example"],      // 이 경로는 읽기 허용
 *     "denyCommands": ["^fly deploy"] }    // 추가 차단 (정규식)
 * 임시 해제: BLUEPLAN_GUARD=off
 */

import { readFileSync } from 'node:fs';
import { join, basename } from 'node:path';

const ALLOW = { continue: true };

function emit(obj) {
  process.stdout.write(JSON.stringify(obj));
  process.exit(0);
}

function deny(reason) {
  emit({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason,
    },
  });
}

// ── 시크릿 파일 판별 ────────────────────────────────────────────────
// .env.example / .env.sample / .env.template 은 값이 없는 템플릿이므로 허용한다.
const SECRET_PATTERNS = [
  /(^|\/)\.env$/i,
  /(^|\/)\.env\.(?!example$|sample$|template$|dist$)[\w.-]+$/i,
  /(^|\/)\.netrc$/i,
  /(^|\/)\.git-credentials$/i,
  /(^|\/)\.npmrc$/i,
  /(^|\/)\.pypirc$/i,
  /(^|\/)\.aws\//i,
  /(^|\/)\.ssh\//i,
  /(^|\/)\.docker\/config\.json$/i,
  /(^|\/)\.kube\/config$/i,
  /(^|\/)id_(rsa|dsa|ecdsa|ed25519)$/i,
  /\.(pem|p12|pfx|jks|keystore)$/i,
  /(^|\/)service[-_]?account.*\.json$/i,
  /(^|\/)credentials(\.json)?$/i,
  /(^|\/)secrets?\.(json|ya?ml|toml)$/i,
];

const isSecretPath = (p, allowPaths) => {
  if (!p) return false;
  const norm = String(p).replace(/\\/g, '/').replace(/^['"]|['"]$/g, '');
  if (allowPaths.some((a) => norm === a || norm.endsWith('/' + a) || basename(norm) === a)) return false;
  return SECRET_PATTERNS.some((re) => re.test(norm));
};

// ── 되돌릴 수 없는 명령 ─────────────────────────────────────────────
const DESTRUCTIVE = [
  [/^rm(\s|$)/, '파일 삭제(rm)는 되돌릴 수 없습니다'],
  [/\bgit\s+reset\s+(--hard|--merge|--keep)\b/, 'git reset --hard 는 커밋되지 않은 작업을 복구 불가능하게 버립니다'],
  [/\bgit\s+clean\b[^|;&]*\s-\w*[fdx]/, 'git clean 은 추적되지 않는 파일(.env 포함)을 삭제합니다'],
  [/\bgit\s+push\b[^|;&]*\s(--force\b|-f\b|--force-with-lease\b)/, 'force push 는 원격 히스토리를 덮어씁니다'],
  [/\bgit\s+push\b[^|;&]*\s(--delete\b|-d\b)/, '원격 브랜치를 삭제합니다'],
  [/\bgit\s+(checkout|restore)\s+(--\s+)?\.(\s|$)/, '작업 트리의 변경사항을 전부 버립니다'],
  [/\bgit\s+branch\s+-D\b/, '병합되지 않은 브랜치를 강제 삭제합니다'],
  [/\bsupabase\s+db\s+reset\b/, 'Supabase 데이터베이스를 드롭하고 재생성합니다'],
  [/\bsupabase\s+projects\s+delete\b/, 'Supabase 프로젝트를 삭제합니다'],
  [/\bprisma\s+migrate\s+reset\b/, 'Prisma가 데이터베이스를 드롭하고 재생성합니다'],
  [/\bprisma\s+db\s+push\b[^|;&]*--accept-data-loss/, '데이터 손실을 확인 없이 수용합니다'],
  [/\b(DROP|TRUNCATE)\s+(TABLE|DATABASE|SCHEMA)\b/i, 'SQL DDL이 테이블/DB를 제거합니다'],
  [/\bDELETE\s+FROM\s+\w+\s*(;|$)/i, 'WHERE 절 없는 DELETE는 전체 행을 지웁니다'],
  [/\bFLUSH(ALL|DB)\b/i, 'Redis 데이터를 전부 비웁니다'],
  [/\bdocker\s+(compose\s+)?down\b[^|;&]*(-v\b|--volumes\b)/, '-v 는 컨테이너 볼륨(=DB 데이터)을 삭제합니다'],
  [/\bdocker\s+system\s+prune\b/, '사용하지 않는 이미지·볼륨을 일괄 삭제합니다'],
  [/\bkubectl\s+delete\b/, '클러스터 리소스를 삭제합니다'],
  [/\bmkfs(\.\w+)?\b/, '디스크를 포맷합니다'],
  [/\bdd\b[^|;&]*\bof=/, 'dd 는 대상 장치/파일을 덮어씁니다'],
  [/\b(shutdown|reboot|halt)\b/, '머신을 내립니다'],
];

// 파이프를 가로지르므로 조각이 아니라 명령 전체에 대해 검사한다.
const WHOLE_COMMAND = [
  [/\b(curl|wget)\b[^;&\n]*\|\s*(sudo\s+)?(ba|z|k)?sh\b/, '원격 스크립트를 받아 즉시 실행합니다(검토 불가)'],
];

const SECRET_READERS = /^(cat|less|more|head|tail|strings|xxd|od|nl|bat|base64|cp|scp|rsync|open)$/;

/** `&&`, `||`, `;`, `|`, 개행, `$( )`, 백틱으로 나눠 각 조각을 검사한다. */
function segments(cmd) {
  const inner = [...cmd.matchAll(/\$\(([^()]*)\)|`([^`]*)`/g)].map((m) => m[1] ?? m[2]);
  return [cmd, ...inner]
    .flatMap((c) => c.split(/\|\||&&|[;\n|]/))
    .map((s) => s.trim())
    .filter(Boolean);
}

/** 앞쪽의 환경변수 대입과 래퍼(sudo/env/npx…)를 벗겨 실제 명령 이름을 얻는다. */
function headOf(seg) {
  const toks = seg.split(/\s+/).filter(Boolean);
  let i = 0;
  while (i < toks.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(toks[i])) i++;
  while (i < toks.length && /^(sudo|command|env|nohup|time|xargs|npx|pnpm|bunx|yarn)$/.test(basename(toks[i]))) {
    i++;
    while (i < toks.length && toks[i].startsWith('-')) i++;
  }
  return { name: basename(toks[i] ?? ''), args: toks.slice(i + 1) };
}

function loadConfig(cwd) {
  const base = { enabled: true, allowCommands: [], allowPaths: [], denyCommands: [] };
  try {
    const raw = JSON.parse(readFileSync(join(cwd || '.', '.claude', 'blueplan-guard.json'), 'utf8'));
    return { ...base, ...raw };
  } catch {
    return base;
  }
}

function main(input) {
  if (process.env.BLUEPLAN_GUARD === 'off') emit(ALLOW);

  const { tool_name: tool, tool_input: args = {}, cwd } = input;
  const cfg = loadConfig(cwd);
  if (cfg.enabled === false) emit(ALLOW);

  const howToAllow =
    '\n\n의도한 작업이라면 사용자에게 확인을 받으세요. ' +
    '항상 허용하려면 .claude/blueplan-guard.json 의 allowCommands/allowPaths 에 추가하거나, ' +
    '이번 세션만 풀려면 BLUEPLAN_GUARD=off 로 실행하세요.';

  // 1) 시크릿 파일 읽기
  if (tool === 'Read' || tool === 'Grep' || tool === 'Glob') {
    for (const key of ['file_path', 'path', 'glob', 'pattern', 'notebook_path']) {
      if (isSecretPath(args[key], cfg.allowPaths)) {
        deny(
          `blueplan guard: 시크릿 파일 접근이 차단되었습니다 — ${args[key]}\n` +
            '이 파일에는 자격증명이 들어 있어 대화 기록과 리포트에 남으면 안 됩니다. ' +
            '변수 이름만 필요하다면 .env.example 을 읽으세요.' +
            howToAllow
        );
      }
    }
    emit(ALLOW);
  }

  if (tool !== 'Bash') emit(ALLOW);

  const command = String(args.command ?? '');
  if (!command) emit(ALLOW);

  if (!cfg.allowCommands.some((a) => command.startsWith(a))) {
    for (const [re, why] of WHOLE_COMMAND) {
      if (re.test(command)) {
        deny(`blueplan guard: 되돌릴 수 없는 명령이 차단되었습니다 — \`${command}\`\n${why}.` + howToAllow);
      }
    }
  }

  for (const seg of segments(command)) {
    if (cfg.allowCommands.some((a) => seg.startsWith(a))) continue;

    const { name, args: rest } = headOf(seg);
    // sudo/xargs/env 같은 래퍼와 앞쪽 환경변수 대입을 벗긴 형태. `sudo rm -rf` 가
    // `^rm` 규칙을 빠져나가지 않도록 원본과 정규화본 양쪽을 검사한다.
    const normSeg = [name, ...rest].join(' ').trim();

    // 2) 시크릿 파일을 셸로 읽기
    if (SECRET_READERS.test(name)) {
      const hit = rest.find((a) => !a.startsWith('-') && isSecretPath(a, cfg.allowPaths));
      if (hit) {
        deny(
          `blueplan guard: 시크릿 파일 읽기가 차단되었습니다 — \`${seg}\`\n` +
            `${hit} 의 내용은 대화 기록에 남습니다. 변수 이름만 필요하면 ` +
            "`grep -o '^[A-Z_]*=' .env` 처럼 값 없이 키만 뽑으세요." +
            howToAllow
        );
      }
    }

    // 3) 되돌릴 수 없는 명령
    for (const [re, why] of DESTRUCTIVE) {
      if (re.test(seg) || re.test(normSeg)) {
        deny(`blueplan guard: 되돌릴 수 없는 명령이 차단되었습니다 — \`${seg}\`\n${why}.` + howToAllow);
      }
    }
    for (const extra of cfg.denyCommands) {
      try {
        if (new RegExp(extra).test(seg) || new RegExp(extra).test(normSeg)) {
          deny(`blueplan guard: 프로젝트 규칙으로 차단되었습니다 — \`${seg}\`` + howToAllow);
        }
      } catch {
        /* 잘못된 정규식은 무시 */
      }
    }
  }

  emit(ALLOW);
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => (buf += c));
process.stdin.on('end', () => {
  try {
    main(JSON.parse(buf || '{}'));
  } catch {
    emit(ALLOW); // fail-open: 가드의 버그가 작업을 막지 않는다
  }
});
