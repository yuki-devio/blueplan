# Checks — Databases

<!-- 사용자가 가장 무서워하는 지점: "의도치 않게 데이터가 날아간다".
     DB 권한은 키의 종류로 결정되고, 파괴는 마이그레이션 명령으로 일어난다. 둘 다 본다. -->

Two independent questions, both required:

1. **Which key is present, and what does that key bypass?** (권한의 크기)
2. **Which commands can destroy, and do they prompt?** (파괴의 경로)

A read-only key with an allowed `db reset` is still dangerous. A powerful key with no CLI is
still an exfiltration risk. Report both axes.

---

## Supabase

### Key types — the single most important distinction

| Key | Env var name (typical) | Format | What it can do |
|---|---|---|---|
| Publishable / anon | `SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_…` (new)<br>`eyJ…` JWT with `role: anon` (legacy) | Only what RLS policies permit. Safe to ship to browsers **by design**. |
| Secret / service_role | `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SECRET_KEY` | `sb_secret_…` (new)<br>`eyJ…` JWT with `role: service_role` (legacy) | **Bypasses Row Level Security completely.** Full SELECT / INSERT / UPDATE / DELETE on every table, plus Storage and Auth admin. RLS policies do not apply to it at all. |
| Personal access token | `SUPABASE_ACCESS_TOKEN` | `sbp_…` | **Account-wide.** Not one project — every project the account owns, via the Management API and the CLI. |

**Identifying a key safely:** go by the variable name and the prefix. Do **not** paste a JWT
anywhere to decode it. If a legacy `eyJ…` value sits under a non-obvious variable name, record it
as 미확인 and put this in the report for the user to run themselves:

```bash
# 사용자가 직접 실행 — 출력에 role만 나옵니다
echo "$YOUR_KEY" | cut -d. -f2 | base64 -d 2>/dev/null | grep -o '"role":"[a-z_]*"'
```

### 🔴 The catastrophic pattern: a secret key behind a public prefix

Bundlers inline any variable with a public prefix into the JavaScript that ships to browsers.
A secret key there is **published to the internet**, not merely at risk.

Grep every `.env*` file and all source for a secret key under these prefixes:

```
NEXT_PUBLIC_   VITE_   EXPO_PUBLIC_   REACT_APP_   PUBLIC_   NUXT_PUBLIC_   GATSBY_
```

`NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` is 🔴 CRITICAL, always, with no qualifiers. The remedy
is not "remove the prefix" — the key is already compromised and must be **rotated** in the
Supabase dashboard (Settings → API), then removed from client-side code.

Also grep client-side source (`app/`, `pages/`, `src/components/`, anything with `"use client"`)
for `createClient(` calls receiving a service-role variable. A key can leak through code even
when the env var name looks fine.

### Where the key sits

| Location | Grade | Note |
|---|---|---|
| `.env.local` / `.env`, gitignored | 🟠 | The AI can read it; any allowed Bash command can use it |
| `.env` **tracked in git** (`git ls-files .env*`) | 🔴 | Committed. Check `git log --all -- .env*` — history keeps it even after deletion |
| `.mcp.json` `env` block, tracked | 🔴 | Same as above |
| Hosting provider secrets only (Vercel/Fly env), absent locally | 🟢 | Best case. Say so — positive findings build trust in the report. |

### Which project is linked — local or production?

```
supabase/.temp/project-ref     ← the linked remote project ref (read this file)
supabase/config.toml           ← local project identifier + local service ports
```

If a remote ref is linked, migration commands target a **real hosted database**. Ask the user
whether that ref is their production project; the ref alone does not say. If unanswered, treat
it as production and grade accordingly — the conservative direction is the correct default.

### Destructive Supabase commands

| Command | Effect | Notes |
|---|---|---|
| `supabase db reset` | Drops and recreates the **local** database | Recoverable; 🟡 unless local holds unique seed data |
| `supabase db reset --linked` | Drops and recreates the **linked remote** database | 🔴 Irreversible loss of live data |
| `supabase db reset --db-url <url>` | Same, against an arbitrary database | 🔴 |
| `supabase db push` | Applies local migrations to the linked remote | A migration containing `DROP TABLE` / `DROP COLUMN` destroys production data. 🔴 if linked to prod |
| `supabase migration repair` | Rewrites migration history | 🟠 |
| `supabase projects delete` | Deletes an entire project | 🔴 |
| `supabase branches delete` | Deletes a preview branch | 🟠 |

**The wildcard trap:** `Bash(supabase:*)` in the allow list grants every row above with no prompt.
Report it as such. The narrower form to recommend:

```jsonc
{ "permissions": {
  "allow": ["Bash(supabase start:*)", "Bash(supabase status:*)", "Bash(supabase gen types:*)"],
  "deny":  ["Bash(supabase db reset:*)", "Bash(supabase db push:*)", "Bash(supabase projects delete:*)"]
} }
```

State the caveat: this only holds while `Bash` is not broadly allowed, and prefix matching can be
worked around by shell chaining. The durable fix is unlinking (`supabase unlink`) so no remote
target exists locally.

### Supabase MCP server

Check `.mcp.json` / `claude mcp list` for `@supabase/mcp-server-supabase`. Two flags decide everything:

| Flag | If present | If **absent** |
|---|---|---|
| `--read-only` | Queries run as a read-only Postgres role. `execute_sql` cannot write. 🟢 | `execute_sql` runs arbitrary SQL including `DELETE`, `DROP`, `TRUNCATE`. 🔴 |
| `--project-ref=<ref>` | Scoped to one project | **Account-scoped**: every project the token owns is reachable, including production, from a session opened in an unrelated repo. 🔴 |

Also report: the server authenticates with `SUPABASE_ACCESS_TOKEN`, a personal access token with
account-wide reach — not a project key. And check whether `allow` contains `mcp__supabase` (whole
server, no prompt) versus specific `mcp__supabase__list_tables`-style entries.

Recommended remediation snippet for the report:

```jsonc
// .mcp.json
{ "mcpServers": { "supabase": {
  "command": "npx",
  "args": ["-y", "@supabase/mcp-server-supabase@latest", "--read-only", "--project-ref=<dev-ref>"]
} } }
```

### RLS status

```bash
grep -ril "enable row level security" supabase/migrations/
```

Tables created without RLS enabled are readable and writable by **anon** key holders — meaning
anyone with the public key from your shipped JavaScript. List tables that appear in `create table`
statements but never in an `enable row level security` statement. If migrations are not in the repo
(schema managed in the dashboard), record 미확인 rather than guessing — and tell the user to check
Database → Tables → RLS in the dashboard.

---

## Direct Postgres / `DATABASE_URL`

Read the URL's **username** — do not print the password:

| Username | Meaning |
|---|---|
| `postgres` | Superuser. Can drop any database, any table, and disable RLS. 🔴 |
| `postgres.<ref>` on port 6543 or 5432 | Supabase pooler/direct connection, superuser-equivalent |
| A named app role | Scoped; report which grants it has as 미확인 unless documented |

Also note whether the host is `localhost`/`127.0.0.1` (local) or a remote hostname (live). Report
`sslmode=disable` on a remote host as 🟡.

`psql` is not on the probe whitelist. Put this in the report for the user to run:

```bash
psql "$DATABASE_URL" -c "select current_user, current_database()"
```

---

## Prisma

| Command | Effect |
|---|---|
| `prisma migrate reset` | **Drops the database**, reapplies migrations, runs seed. 🔴 against any non-local URL |
| `prisma db push --accept-data-loss` | Applies schema changes that delete columns/tables without confirmation. 🔴 |
| `prisma db push` | Prompts on data loss — but the prompt is inside the command, not a Claude Code permission prompt |
| `prisma migrate deploy` | Applies pending migrations to whatever `DATABASE_URL` points at |

Which database these hit depends entirely on the `DATABASE_URL` in scope at execution time —
check `.env`, `.env.local`, and any `env` block in Claude Code settings that overrides it. A
`prisma/schema.prisma` with `url = env("DATABASE_URL")` and a production URL in `.env` means the
"local" command is a production command.

## Drizzle

| Command | Effect |
|---|---|
| `drizzle-kit push` | Applies the schema directly to the database, dropping removed columns. 🔴 against production |
| `drizzle-kit drop` | Deletes migration files |

Read `drizzle.config.ts` for which URL it resolves.

## Redis / Valkey

`FLUSHALL` and `FLUSHDB` erase everything with no confirmation and no recovery. Check for
`redis-cli` availability, `REDIS_URL` / `UPSTASH_REDIS_*` variables, and whether the URL is local
or hosted. Also note that Redis is often the session store — flushing it logs out every user even
though no "data" is lost in the user's mental model.

## MongoDB

`MONGODB_URI` / `MONGO_URL`. Check whether the user in the URI has `dbAdmin`/`root`. `dropDatabase()`
and `deleteMany({})` are the destructive calls; grep application code for `deleteMany`, `drop(`,
and `findOneAndDelete` used without a filter.
