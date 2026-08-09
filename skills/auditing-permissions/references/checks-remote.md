# Checks — Cloud, Deploy, Network, Supply Chain

<!-- "라이브 서버가 내려간다"의 경로. 자격증명이 존재하는지(정적) + 실제로 로그인돼 있는지(프로브)
     둘 다 확인해야 한다. 파일이 없어도 env var로 살아있을 수 있다. -->

For every credential here, check **both** the file on disk and the environment variable form.
A missing `~/.aws/credentials` proves nothing if `AWS_ACCESS_KEY_ID` is exported.

## 1. Cloud identity — who is this AI, to the cloud?

### AWS

Static: `~/.aws/credentials`, `~/.aws/config` (list profile names only — never the keys),
and env names `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN`, `AWS_PROFILE`,
`AWS_REGION`. Also check for `AKIA…` strings anywhere in tracked files —
`git grep -nE 'AKIA[0-9A-Z]{16}'` finds committed access keys.

Probe: `aws sts get-caller-identity` → returns Account, ARN, UserId. Report the **account ID and
the principal name**, and ask the user whether that account is production. An ARN containing
`prod`, `production`, or the company's main account number deserves a direct callout.

What the report must say plainly: a valid AWS credential is not "AWS access" — it is whatever
IAM grants that principal, which is frequently far more than the user remembers granting.
`aws iam list-attached-user-policies` and `aws iam get-account-authorization-details` would answer
it, but they are not on the whitelist and usually require permissions the principal lacks. Record
the actual policy scope as **미확인** and give the user the console path
(IAM → Users → the principal → Permissions) rather than asserting a boundary you did not verify.

Note `AWS_PROFILE` set inside a Claude Code `env` block (see `checks-claude-code.md`) — that
silently points every command at whichever account the profile names.

### Google Cloud

Static: `~/.config/gcloud/`, `GOOGLE_APPLICATION_CREDENTIALS` (path to a service-account JSON —
report the path and whether the file exists, not its contents).
Probe: `gcloud auth list`, `gcloud config list` → active account and the **current project**.
The active project determines what `gcloud` commands hit.

### Azure

Static: `~/.azure/`. Probe: `az account show` → subscription name and id.

### Other provider tokens

Recognize by variable name and prefix from the env-name list and from `.env*` files. Record the
name, the prefix, and the length — never the value.

| Prefix / name | Service | Note |
|---|---|---|
| `sk_live_`, `rk_live_` | Stripe | **Live** money movement: charges, refunds. 🔴 `sk_test_` is 🟢 |
| `ghp_`, `gho_`, `github_pat_` | GitHub | See `checks-local.md` for scopes |
| `sk-ant-`, `ANTHROPIC_API_KEY` | Anthropic | Billable |
| `sk-`, `OPENAI_API_KEY` | OpenAI | Billable |
| `xoxb-`, `xoxp-` | Slack | Can post as the app/user |
| `SG.` | SendGrid | Can send mail from your domain |
| `TWILIO_AUTH_TOKEN` | Twilio | Billable per message |
| `VERCEL_TOKEN`, `NETLIFY_AUTH_TOKEN`, `FLY_API_TOKEN`, `CF_API_TOKEN` | Hosting | Deploy and delete |

For anything billable, add a line to the report: an unattended loop can spend real money, and
that is a risk category users never think of as a "permission".

## 2. Deploy targets — what is one command away from production?

### Kubernetes 🔴 territory

```
kubectl config current-context
kubectl config get-contexts
```

The **current context** is the single most consequential unlabeled setting on a developer machine.
If it names a production cluster, then `kubectl delete`, `kubectl scale --replicas=0`, and
`kubectl rollout restart` take down live traffic — and nothing in the command text says "production".

Report the current context name verbatim, list the other available contexts, and state which
namespace is default. If the context is production, this is 🔴 whenever `Bash(kubectl:*)` or bare
`Bash` is allowed.

Remediation for the report: switch the context to a non-production one
(`kubectl config use-context <dev>`) as the primary fix; `deny` rules are the secondary.

### Vercel

`.vercel/project.json` (project + org id, not secret), `vercel whoami`, `VERCEL_TOKEN`.

- `vercel --prod` / `vercel deploy --prod` publishes to production immediately
- `vercel rollback`, `vercel remove`, `vercel domains rm`, `vercel env rm` are destructive
- `vercel env pull` writes provider secrets into a local file — that is how production credentials
  arrive on a machine that did not have them. 🟠

### Other hosting

`fly.toml` + `flyctl deploy`/`flyctl apps destroy`, `railway up`, `netlify deploy --prod`,
`heroku` CLI, `wrangler deploy` / `wrangler d1 execute` / `wrangler r2 object delete`.
Report which CLIs are installed **and authenticated** — an installed-but-logged-out CLI is 🟢.

### SSH — direct server access

`~/.ssh/config` names hosts; `~/.ssh/known_hosts` records what has been connected to. Read the
config's `Host` entries (aliases and hostnames are not secrets) and report which servers are one
`ssh <alias>` away. An alias like `prod` or `web-1` plus broad Bash access means shell on a live
server, and from there nothing in Claude Code's permission model applies at all. 🔴

Also check for `AuthorizedKeysFile`/agent forwarding (`ForwardAgent yes`) — agent forwarding lets
a compromised remote host reuse the local key.

### Process managers

`pm2 restart|delete|stop`, `systemctl restart|stop`, `docker compose down -v`
(**`-v` deletes volumes — that is the database**), `docker system prune -a --volumes`.
Grep `package.json` scripts, `Makefile`, and `scripts/` for these.

## 3. Outbound network — the exfiltration axis

Data loss is one failure mode; data leaving is the other. Report what could carry it out:

| Path | Check |
|---|---|
| `WebFetch` / `WebSearch` allowed | Merged allow list. `WebFetch(domain:*)` or bare `WebFetch` = arbitrary outbound |
| `Bash(curl:*)`, `Bash(wget:*)` | Arbitrary POST of any file the AI can read |
| Remote MCP servers (HTTP/SSE) | Tool arguments — which can contain file contents — go to a third party. Report the endpoint host. |
| Hooks that call out | See `checks-claude-code.md`; a `PostToolUse` hook posting to a webhook is silent |
| Hardcoded webhooks in code | `git grep -nE 'hooks\.slack\.com\|discord\.com/api/webhooks\|webhook\.site'` |
| Telemetry / analytics env vars | `DISABLE_TELEMETRY`, `DO_NOT_TRACK`, vendor SDK keys |

The finding that matters is the **combination**: credential-read access AND outbound access AND
no approval prompt. Any one alone is routine; all three together is 🔴. Say so explicitly in the
report — users evaluate permissions one at a time and miss the composition.

## 4. Supply chain

| Check | How | Grade |
|---|---|---|
| `.npmrc` with `_authToken` (project or `~`) | Existence only | 🟠 — publish access to your packages |
| `npm publish` reachable | `npm whoami` + allow rules | 🟠/🔴 if the package is public and widely used |
| `postinstall` / `preinstall` scripts | `grep -n '"\(pre\|post\)install"' package.json` | Any `npm install` runs them; a dependency's install script runs arbitrary code as you |
| Lockfile present | `package-lock.json` / `pnpm-lock.yaml` / `yarn.lock` | Absent = unpinned transitive deps. 🟡 |
| `npm i` in an allowed script | Installing a typo-squatted package is a full machine compromise | 🟡 |
| `PYPI_TOKEN`, `CARGO_REGISTRY_TOKEN`, `.pypirc` | Same as npm for other ecosystems | 🟠 |

`docker login` credentials live in `~/.docker/config.json` — report existence and which registries
are listed (registry hostnames are not secrets; the auth blobs are).
