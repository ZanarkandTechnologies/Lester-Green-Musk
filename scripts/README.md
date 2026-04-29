# Scripts

Purpose: small repo-local utilities that support the skill workflow.

Public entrypoints:

- `scripts/copy-skills.sh` copies the skill names listed in `DEFAULT_SKILLS` into `.agents/skills` and fully overwrites older copies of those same skills.

Minimal example:

```bash
scripts/copy-skills.sh
```

Behavior:

- If `.agents/skills/<skill>` already exists, the script deletes that destination folder first and then copies the current repo version in its place.
- If you run the script with no args, it also deletes equipped skills in `.agents/skills` that are not listed in `DEFAULT_SKILLS`.
- If you pass explicit skill names or `--all`, the script copies only that requested set and does not prune unrelated equipped skills.

How to test:

```bash
scripts/copy-skills.sh --list
scripts/copy-skills.sh --dest .tmp-agent-skills
```
