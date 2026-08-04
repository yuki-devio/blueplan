# Implementation Plans

- Naming: `NNN-<feature-slug>.md` (zero-padded, ordered).
- Created ONLY by the `blueplan:planning-features` skill; executed ONLY by `blueplan:executing-steps`.
- Each plan is self-contained: a fresh session executes it from the file alone.
- Plan status: `draft | approved | in-progress | complete | abandoned` (frontmatter). Per-step status lines inside the file are authoritative.
