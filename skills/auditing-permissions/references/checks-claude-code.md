# Checks — Claude Code Itself

<!-- 이 파일은 "AI에게 직접 부여된 권한"을 본다. 다른 참조 파일이 "무엇에 접근 가능한가"를 본다면
     여기는 "그 접근에 승인 프롬프트가 붙는가"를 결정한다. 거의 모든 🔴는 여기서 나온다. -->

This is the layer users understand least and that determines whether every other capability
prompts or fires silently.

## 1. Settings files — read all of them, in precedence order

Highest precedence wins. Read every file that exists; a permissive rule in a low-precedence
file is still live unless something above overrides it.

| Precedence | Path | Notes |
|---|---|---|
| 1 (highest) | `/Library/Application Support/ClaudeCode/managed-settings.json` (macOS)<br>`/etc/claude-code/managed-settings.json` (Linux/WSL)<br>`C:\ProgramData\ClaudeCode\managed-settings.json` (Windows) | Enterprise policy. Cannot be overridden. Its absence is normal for individuals. |
| 2 | CLI flags on the running session | Not readable from disk — ask, or check shell history for `--dangerously-skip-permissions` |
| 3 | `<project>/.claude/settings.local.json` | Personal, usually gitignored. **Most permissive rules live here.** |
| 4 | `<project>/.claude/settings.json` | Checked into the repo — applies to every teammate |
| 5 (lowest) | `~/.claude/settings.json` | Applies to every project on this machine |

Record which file each rule came from. "누가 이 권한을 켰는지"가 해결방안을 바꾼다:
a rule in `~/.claude/settings.json` is affecting projects the user isn't even thinking about.

## 2. The permission block

```jsonc
{
  "permissions": {
    "allow": ["Bash(npm run test:*)"],
    "ask":   ["Bash(git push:*)"],
    "deny":  ["Read(./.env)", "Bash(curl:*)"],
    "defaultMode": "default",
    "additionalDirectories": ["../shared-lib"]
  }
}
```

**Evaluation order:** `deny` → `ask` → `allow` → `defaultMode`. Deny always wins.

### defaultMode — check this first

| Value | Meaning | Grade |
|---|---|---|
| `bypassPermissions` | **Every tool runs with no prompt.** Every other finding in the report becomes "승인 없이 가능". | 🔴 always |
| `acceptEdits` | File edits/writes apply with no prompt. Bash still prompts. | 🟠 (🔴 if the project deploys or holds prod credentials) |
| `plan` | Read-only until the user approves a plan. | 🟢 |
| `default` / absent | Prompts on first use of each tool. | 🟢 |

Also check `~/.claude/settings.json` for `"dangerouslySkipPermissions"`-adjacent settings and
any shell alias/script that adds `--dangerously-skip-permissions` (grep `~/.zshrc`, `~/.bashrc`,
`package.json` scripts, `Makefile`, `.envrc`). An alias like `alias cc='claude --dangerously-skip-permissions'`
means the user's normal way of starting Claude has no prompts at all — that is 🔴 and they almost
certainly do not think of it as a setting.

### Wildcard audit of `allow`

Rank allow-list entries by blast radius, not by how they read:

| Pattern | Why it matters |
|---|---|
| `Bash` or `Bash(*)` | Unrestricted shell. Everything else in this report is reachable without a prompt. 🔴 |
| `Bash(<tool>:*)` where tool has destructive subcommands | `Bash(supabase:*)`, `Bash(aws:*)`, `Bash(kubectl:*)`, `Bash(vercel:*)`, `Bash(psql:*)`, `Bash(docker:*)`, `Bash(prisma:*)`, `Bash(gh:*)` — one wildcard grants every subcommand, including the destructive ones. 🔴/🟠 |
| `Bash(rm:*)`, `Bash(git push:*)`, `Bash(git reset:*)` | Direct destruction. Note that `git push:*` also covers `--force`. |
| `Read(//...)` absolute-path rules, or `Read(~/...)` | Reads outside the project — check whether it reaches `~/.aws`, `~/.ssh`, other repos |
| `Edit(**)` / `Write(**)` | Writes anywhere the process can reach |
| `WebFetch`, `WebFetch(domain:*)` | Outbound. Combined with credential read access, this is an exfiltration path. |
| `mcp__<server>` with no tool suffix | Grants **every** tool that server exposes, including tools added in future server updates |

Explicitly report `deny` as a **weak** control when `Bash` is broadly allowed — see the Honest
Limits section of SKILL.md and say the same thing in the report.

### additionalDirectories

Each entry extends the AI's file access beyond the project. Resolve each to an absolute path
and state plainly what is inside it. `"../"` or `"~"` here means the AI can read every other
project on the machine, including their `.env` files. 🟠 minimum.

## 3. Hooks — arbitrary code execution

Look in every settings file for a `hooks` block, and check `.claude/hooks/` for scripts.

```jsonc
"hooks": {
  "PreToolUse": [{ "matcher": "Bash", "hooks": [{ "type": "command", "command": "./scripts/gate.sh" }] }]
}
```

Events: `PreToolUse`, `PostToolUse`, `UserPromptSubmit`, `Notification`, `Stop`, `SubagentStop`,
`PreCompact`, `SessionStart`, `SessionEnd`.

For each hook, read the command it runs and report:

- **What it executes** — a hook runs on the user's machine with the user's privileges, on every
  matching event, with no prompt. A hook that pipes tool input to a remote endpoint is a silent
  exfiltration channel. 🔴
- **Whether it came from outside** — hooks installed by a plugin or copied from a blog post are
  the same risk as running an unreviewed script.
- **Whether it is a guardrail** — a `PreToolUse` hook that blocks destructive commands is a
  positive finding. Report it as 🟢 and note what it does and does not cover.

## 4. MCP servers

Sources: `<project>/.mcp.json`, `~/.claude.json`, `claude mcp list`, and plugin-provided servers.

For each server, report **which tools it exposes and what those tools can do** — this is the
part users never see. A server named "database" that exposes `execute_sql` grants arbitrary SQL.

| Check | Why |
|---|---|
| Server command/args | A `--read-only` or `--project-ref=` flag drastically changes blast radius. Note its presence or absence explicitly. |
| Credentials in `env` of the server config | Tokens sitting in `.mcp.json` are committed to the repo if `.mcp.json` is tracked. Check `git ls-files .mcp.json`. |
| `enableAllProjectMcpServers: true` | Every server in `.mcp.json` is trusted automatically, including ones added later by a teammate or a `git pull`. 🟠 |
| `enabledMcpjsonServers` list | The explicit, safer form. Report which are enabled. |
| Remote (HTTP/SSE) vs local (stdio) | Remote servers send tool arguments — which can contain file contents — to a third party. |
| Matching `mcp__*` entries in `allow` | An MCP tool that is allow-listed runs without a prompt |

## 5. Plugins and marketplaces

Check `~/.claude/plugins/`, `.claude-plugin/marketplace.json`, and installed plugin list.
Plugins ship skills, commands, hooks, and MCP servers. Report each installed plugin's source
(who publishes it) and whether it contributes hooks or MCP servers — those are the parts that
execute or reach the network.

## 6. The `env` block and `apiKeyHelper`

```jsonc
{ "env": { "AWS_PROFILE": "production" }, "apiKeyHelper": "/bin/sh -c 'cat ~/.secret'" }
```

- `env` injects variables into every Bash command Claude runs. A value like `AWS_PROFILE=production`
  or `NODE_ENV=production` silently points every command at live infrastructure. 🟠/🔴
- `apiKeyHelper` runs a shell command to fetch credentials. Report what it runs.

## 7. CLAUDE.md and instruction files

Read `CLAUDE.md`, `.claude/CLAUDE.md`, `~/.claude/CLAUDE.md`, and any `@`-imported files.
Instructions are not permissions, but they change behavior in ways that interact with permissions:

- Standing instructions like "커밋하고 푸시까지 해줘" or "확인하지 말고 진행해" convert a
  prompted capability into an effectively automatic one. Report these as 🟡 with the exact line.
- Instructions pulled in from a file the user did not write (a plugin, a template repo) deserve
  a line in the report — the user is running instructions they have not read.
