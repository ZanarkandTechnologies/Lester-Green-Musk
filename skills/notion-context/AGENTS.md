# Notion Context Module

- Keep this skill state-driven: onboarding writes the live database mappings to `onboarding/state.json`, and fetches should read that state instead of hardcoding IDs.
- Preserve the named-view contract in `SKILL.md` and `README.md`; the primary weekly read is `tasks-this-week`, and it should also accept a human alias like `fetched tasks from this week`.
- Treat task status buckets as user-facing behavior. When the mapped task database exposes them, preserve `backlog`, `not started`, `in progress`, and `done` in summaries rather than collapsing them away.
- Prefer concise summaries over raw dumps, but keep the JSON artifact detailed enough for later planning logic.
