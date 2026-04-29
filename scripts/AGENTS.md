# `scripts/AGENTS.md`

Scope: everything under `scripts/`.

Rules:

- Keep scripts simple and executable from the repo root.
- Prefer portable shell unless the script clearly benefits from Bash features.
- Resolve repo-relative paths from the script location, not from the caller's cwd.
- Fail fast on invalid input and print clear usage text.
