---
name: auditing-permissions
description: Use when the user asks what the AI is actually allowed to do in this project, whether something dangerous could happen, or wants a permission/blast-radius audit before letting an agent near a live database, production deploy, or git remote. Keywords - 권한, 권한 검사, 권한 감사, 보안 점검, AI가 뭘 할 수 있어, 위험한 거 없어, 데이터 날아갈까, 프로덕션, permission audit, blast radius, service_role, bypassPermissions, 실수로 삭제.
---

# Auditing Permissions

## Overview

Permissions are scattered across layers — three tiers of Claude Code settings, MCP servers,
`.env` files, CLI login state, git remote auth. No single file tells you the effective
blast radius. This skill assembles them into one answer: **what can this AI read, create,
modify, and destroy right now, and without which approvals.**

**This skill is read-only.** It produces two documents and changes nothing else.

## The Iron Rule

**Never run a command that writes, deletes, deploys, migrates, publishes, or transmits.**

Only commands on the probe whitelist below may be executed. Anything not on the list is
not "probably fine" — it is recorded as 미확인 (unverified) in the report. An auditor that
causes the incident it was hired to prevent is a total failure of the skill.

| Rationalization | Reality |
|---|---|
| "`db reset` is just local, it's safe" | `--linked` variants exist and flags get misread. Not on the list → don't run it. |
| "I need to write a temp file to test access" | File-existence checks answer the same question without writing. |
| "`--dry-run` makes it harmless" | Dry-run flags are inconsistent across tools. Not on the list → don't run it. |
| "Deleting the test row I just made is cleanup" | You should never have made it. Read-only means read-only. |
| "The user said audit everything, so I have permission" | Audit ≠ mutate. Ask before anything off-list; never assume. |

## The Process

### 1. Scope

Confirm the project root. Ask the user one question: **"이 프로젝트가 실제 운영 중인
서비스(프로덕션 DB/서버)에 연결돼 있나요?"** The answer changes severity, not the checks —
the same `service_role` key is 🟡 against a throwaway local project and 🔴 against live users.

Also note whether the repo is public (`git remote -v` + `gh repo view`), because that
determines whether the report itself is safe to commit.

### 2. Inventory (static)

Detect what exists before deciding what to check. Then read **only** the matching reference files:

| If present | Read |
|---|---|
| Always — every project | `references/checks-claude-code.md` |
| Always — every project | `references/checks-local.md` |
| `supabase/`, `prisma/`, `drizzle*`, `DATABASE_URL`, any DB client dependency | `references/checks-database.md` |
| `~/.aws`, `~/.config/gcloud`, `.vercel/`, `k8s`/`kubectl`, `Dockerfile`, deploy configs, `.npmrc` | `references/checks-remote.md` |

Do not preload all four. An audit of a static site should not read the Supabase section.

### 3. Domain checks

Work through the checks in each loaded reference file. For every finding, capture the
**evidence as `file:line` or an exact command output** — a claim without a location is
not a finding, it is a guess.

### 4. Read-only probes

Run only these. Each is a state query with no side effects. If one fails (not installed,
not logged in), record the failure and continue — never escalate to a different command.

```
# Claude Code
claude mcp list

# Git / GitHub
git remote -v
git config --list
git status --short
git log -1 --format=%H
gh auth status

# Environment variable NAMES only — never print values
env | cut -d= -f1 | sort

# Cloud identity
aws sts get-caller-identity
gcloud auth list
gcloud config list
az account show

# Cluster / deploy targets
kubectl config current-context
kubectl config get-contexts
vercel whoami
npm whoami

# Credential file EXISTENCE only — never cat these
ls -la ~/.aws ~/.ssh ~/.config/gcloud ~/.docker 2>/dev/null
```

Reading files with the Read tool is allowed for config and code. `.env` files: read them,
but see the masking rule below.

### 5. Assemble

Build the capability matrix and assign severity. A capability only counts as "승인 없이
가능" (possible without approval) if a rule in the merged `allow` list, or a `defaultMode`
of `acceptEdits`/`bypassPermissions`, covers it.

| Grade | Definition |
|---|---|
| 🔴 CRITICAL | Irreversible data or service loss is possible **without an approval prompt** |
| 🟠 HIGH | Irreversible action is possible but prompts first, **or** a live credential is exposed to a path that leaks it |
| 🟡 MEDIUM | Real impact, but recoverable |
| 🟢 INFO | Worth knowing; no action needed |

### 6. Write

Write both documents using `templates/`:

1. `docs/security/permission-audit-YYYY-MM-DD.md` — full report (`templates/audit-report.md`)
2. `.claude/docs/permissions.md` — short binding boundary doc (`templates/permissions-boundary.md`)

Then **ask** the user whether to add one routing row to `.claude/docs/INDEX.md`:

```
| Touching credentials, DB, deploy, or git remote (권한·배포·DB) | `.claude/docs/permissions.md` |
```

Add it only on a yes. That row is the sole exception to "modify nothing."

Finally, print a terminal summary: the counts per severity, the top three 🔴/🟠 findings in
one line each, and the two file paths.

## Secret Handling — Non-Negotiable

The report gets committed to git. Treat it as public.

- **Never write a secret value.** Record: variable name, detected type, first 4 characters, length.
  `SUPABASE_SERVICE_ROLE_KEY (service_role JWT, "eyJh…", 218자)`
- Never echo, cat, or print a `.env` file, `~/.aws/credentials`, `~/.ssh/id_*`, `~/.git-credentials`,
  or `~/.npmrc` into the transcript. Read them with the Read tool, extract names and prefixes, and
  do not quote the lines back.
- Never transmit findings anywhere — no WebFetch, no gist, no paste service.
- Before writing the report, re-scan your own draft for anything longer than 4 characters that
  looks like a key. If in doubt, mask it.

## What This Skill Does Not Do

- Does not modify `settings.json`, `.gitignore`, or any existing file (except the INDEX row, on request)
- Does not install hooks or guardrails — the report explains how; the user decides
- Does not rotate keys or change database permissions — those are external actions, and the report
  gives the exact commands for the user to run
- Does not claim a system is safe. The report has a **확인하지 못한 것** section, and everything
  unverified goes in it. Silent omission is the failure mode that gets people hurt.

## Honest Limits — State These in the Report

- The audit reflects settings **as of now**. A session started with `--dangerously-skip-permissions`,
  or an edit to `settings.local.json`, invalidates it.
- Bash permission rules are prefix-matched and best-effort. `Bash(git push:*)` does not reliably stop
  `git push --force`, and chained commands (`npm test && rm -rf dist`) can slip past a rule that only
  inspects the prefix. Treat an `allow` entry as a floor on capability, never a ceiling.
- A `deny` rule blocks the tool, not the capability. If `Bash` is broadly allowed, denying one command
  spelling rarely closes the hole — removing the credential does.

## Checklist

- [ ] Production question asked; repo public/private determined
- [ ] Only matching `references/` files read
- [ ] Every finding carries `file:line` or command-output evidence
- [ ] No command executed outside the probe whitelist
- [ ] No secret value written anywhere; masking verified on the final draft
- [ ] Capability matrix distinguishes 읽기 / 생성 / 수정 / 삭제 and approval-required per resource
- [ ] Every finding has 최악의 시나리오 + 해결방안 + 되돌리는 법
- [ ] 확인하지 못한 것 section lists every failed probe and skipped area
- [ ] Both documents written; INDEX.md row asked about, not assumed
