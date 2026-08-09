# Checks — Filesystem, Git, GitHub

<!-- 로컬에서 되돌릴 수 없는 손실이 나는 두 경로: 파일 삭제와 git 히스토리 파괴.
     그리고 이 머신의 자격증명 파일에 AI가 닿을 수 있는지. -->

## 1. Filesystem reach

### Where can it write?

The working directory is always reachable. What matters is what else is:

| Check | How | Finding if true |
|---|---|---|
| `additionalDirectories` in settings | See `checks-claude-code.md` | Access to sibling projects and their `.env` files |
| Symlinks pointing outside the repo | `find . -maxdepth 3 -type l -not -path './.git/*' -not -path './node_modules/*'` | A symlink to `~` or `/` makes "project-scoped" access meaningless |
| Working directory is `~` or `/` | `pwd` | Everything on the machine is "in the project". 🔴 |

### Credential files reachable from here

Check existence only — **never read the contents of these into the transcript**:

```
~/.ssh/id_*            ~/.ssh/config          ~/.aws/credentials
~/.git-credentials     ~/.npmrc               ~/.netrc
~/.docker/config.json  ~/.kube/config         ~/.config/gcloud/
```

Report which exist and whether a permission rule blocks reading them. In the default
configuration nothing blocks it — the `Read` tool prompts, but a user clicking through
prompts during a vibe-coding session is exactly the failure mode this audit exists for.

`~/.git-credentials` and `~/.npmrc` are the sharpest of these: they hold tokens in
**plaintext**, and a single approved `Read` hands over push and publish access.

**해결방안 to put in the report:**

```jsonc
// .claude/settings.json
{ "permissions": { "deny": [
  "Read(~/.ssh/**)", "Read(~/.aws/**)", "Read(~/.git-credentials)",
  "Read(~/.npmrc)", "Read(~/.netrc)", "Read(./.env)", "Read(./.env.*)"
] } }
```

Note honestly in the report that this blocks the `Read` tool, not `Bash(cat ...)` — so it only
holds if Bash is not broadly allowed.

### Destructive command exposure

Grep the merged allow list and the project's own scripts for these. A `package.json` script
named `reset` or `clean` that runs `rm -rf` is one "정리해줘" away from firing:

```
rm -rf        git clean -fdx     find ... -delete
truncate      dd                 mkfs
```

Check `package.json` `scripts`, `Makefile`, and `scripts/*.sh`. Report the script name the user
would actually type, not just the underlying command — the user types `npm run reset`, and that
is the string they need to recognize as dangerous.

## 2. Git — what history can be destroyed

### Remote and identity

```
git remote -v
git config --list
```

Report:

| Item | Why it matters |
|---|---|
| Remote URL and host | Is this pushing to the company org or a personal fork? |
| `https://` vs `git@` | HTTPS uses a stored token (see credential helper); SSH uses a key |
| `credential.helper` | `store` = plaintext `~/.git-credentials`. `osxkeychain`/`manager` = OS keychain, better. |
| `user.email` | Commits attributed to whom — a mismatch with the user's identity is worth a 🟢 line |
| `push.default`, `push.autoSetupRemote` | `autoSetupRemote` means a `git push` on a new branch creates it on the remote without extra steps |

### Irreversible git operations

These destroy work that has no local copy. Report each as reachable or not, with the rule that
grants it:

| Command | Damage |
|---|---|
| `git push --force` / `--force-with-lease` | Overwrites remote history. On a shared branch, other people's commits vanish. |
| `git push --delete <branch>` | Deletes a remote branch |
| `git reset --hard` | Discards uncommitted work with no recovery path outside reflog |
| `git clean -fdx` | Deletes untracked files — **including `.env`**, which is usually the only copy |
| `git checkout .` / `git restore .` | Same as above for tracked files |
| `git rebase` / `git commit --amend` on pushed commits | Rewrites history; requires force-push to land |

**Critical nuance for the report:** `Bash(git push:*)` matches `git push --force` too. Users add
that rule meaning "let it push my feature branch" and get force-push with it. Prefix matching
does not understand flags.

### Branch protection — the real backstop

```
gh repo view --json defaultBranchRef,visibility,isPrivate
gh api repos/{owner}/{repo}/branches/{branch}/protection
```

If the default branch is protected, force-push damage is capped regardless of local settings —
report that as a 🟢 mitigating factor with the same weight you would give a 🔴 finding. If it is
**not** protected and force-push is allowed, that combination is a 🔴 even though neither half
looks alarming alone.

If `gh` is not installed or not authenticated, this goes in 확인하지 못한 것 — do not assume
either way.

### Repo visibility

`gh repo view --json isPrivate`. If the repo is **public**, then:

- The audit report itself must not be committed — say so at the top of the report
- Any secret ever committed is already compromised, not merely at risk
- Check `git log --all --full-history -- .env .env.local` for secrets in history

## 3. GitHub CLI scope

```
gh auth status
```

Report the account, the host, and **the token scopes**. Scopes determine reach far beyond this
repo:

| Scope | Grants |
|---|---|
| `repo` | Full read/write to **every** repository the account can access, not just this one |
| `workflow` | Can modify GitHub Actions workflows — which run with repository secrets |
| `admin:org` | Organization-level changes |
| `delete_repo` | Can delete repositories 🔴 |
| `write:packages` | Can publish packages |

A `repo`-scoped token plus broad `Bash(gh:*)` means the AI can act on every repo the user owns.
Most users assume Claude is scoped to the folder they opened. State that assumption is wrong,
in those words.

Also check for `GH_TOKEN` / `GITHUB_TOKEN` in the environment variable name list — an env token
overrides `gh auth` and may have different scopes that `gh auth status` does not show. If one is
present, report it as 미확인 scope rather than guessing.

## 4. CI configuration

`.github/workflows/*.yml`, `.gitlab-ci.yml`, and similar.

- Which secrets are referenced (`${{ secrets.* }}`) — these are the credentials a pushed commit
  can reach, even though they are not on this machine
- Whether workflows trigger on `pull_request_target` or run on self-hosted runners
- Whether a workflow deploys to production on push to the default branch — if so, **`git push`
  is a deploy**, and the report must say that explicitly. Users grant push permission without
  realizing it is also production-release permission. 🟠/🔴
