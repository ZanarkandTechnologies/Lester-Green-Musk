# Docs

Purpose: durable repo-facing documentation and change history.

Public entrypoints:

- `docs/HISTORY.md` records shipped or durable repo changes.

Minimal example:

```text
2026-04-30 05:21 +0800 | TOOLING | add skill copy helper for .agents/skills
```

How to test:

```bash
sed -n '1,20p' docs/HISTORY.md
```
