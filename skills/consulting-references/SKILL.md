---
name: consulting-references
description: Use before starting any coding, design, or testing task in a project that has a .claude/docs directory, or when unsure which project rules apply. Keywords - conventions, style guide, reference docs, project rules, 컨벤션, 참고 문서, 코딩 규칙, 디자인 가이드, 프로젝트 규칙.
---

# Consulting References

## Overview

Project rules too big for CLAUDE.md live in `.claude/docs/*.md`. `.claude/docs/INDEX.md` is the router: a table mapping task types to docs. This skill contains NO routing table of its own — the project owns the routing, so projects can add docs without touching this plugin.

## The Process

1. Read `.claude/docs/INDEX.md`.
2. Match your current task against its table. Read **every** matching doc, not just the first — a UI task with code changes matches both design-guide and conventions.
3. Treat what you read as binding rules, not suggestions.
4. No row matches? Proceed, but say so explicitly ("no reference doc covers X").
5. `INDEX.md` missing but `.claude/docs/*.md` files exist? Pick by filename, then suggest running blueplan:initializing-blueplan to create the index.

## When to Re-consult

- The task type changes mid-session (backend work → now touching UI: read design-guide now)
- Building a context package for a subagent dispatch (blueplan:executing-steps step 3)
- Starting to write a plan (blueplan:planning-features prerequisites)

## Maintaining the Docs

When the user corrects you on a recurring rule ("우리는 항상 X로 해"), offer to append it to the relevant `.claude/docs/` file — and add an INDEX.md row if it's a new doc. Rules that live only in conversation die with the session.

## Anti-pattern

Do NOT preload every doc in `.claude/docs/` "just in case" — that wastes context and buries the relevant rules. Route via the table; read only what matches.
