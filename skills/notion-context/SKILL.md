---
name: notion-context
version: 1.0.0
description: "Notion integration skill for project/task context and table operations."
metadata:
  openclaw:
    emoji: "📝"
    requires:
      env: ["NOTION_API_KEY"]
    primaryEnv: "NOTION_API_KEY"
    os: ["linux", "darwin", "win32"]
  internal:
    onboarding:
      completed: false
      stateFile: "onboarding/state.json"
      lastRunAt: null
allowed-tools: Read, Glob, rg, Shell
---

# Notion Context

Use this skill for Notion reads/writes and normalized context extraction.

## Trigger Conditions

- `fetch-life-context` provider routing for Notion.
- Any request requiring project/task state from Notion.
- Any request to update Notion task/project records.
- First-time setup or remapping of Notion databases.

## Canonical Inputs

- Auth: `NOTION_API_KEY` (single canonical source in `skills.entries.notion-context.env`)
- API version: `NOTION_VERSION`
- Databases are configured in `databases/*.md`
- Onboarding reference is in `onboarding/discovery.md`

## Database Definitions

In each file, we should store details about how the user structured their databases, what fields they have, what options for tags etc and we store working code there to fetch common db views or crud actions

- `databases/goals.md`
- `databases/projects.md`
- `databases/tasks.md`
- <add more files based on user's notion>

## Onboarding State (custom metadata)

Use the custom frontmatter at `metadata.internal.onboarding` to track local setup state:

- `completed`: whether setup has already been done in this workspace.
- `stateFile`: where to persist onboarding run results.
- `lastRunAt`: last onboarding timestamp (ISO string or null).

This is custom skill metadata for your own workflows, not OpenClaw load gating.

## Onboarding Assets

- `onboarding/discovery.md`
- `onboarding/references/data-source-api.md`
- `onboarding/scripts/discover.js`
- `onboarding/scripts/fetch-context.js`

## Workflow (First-Load Contract)

1. Read onboarding state from frontmatter + `onboarding/state.json` if present.
2. If not onboarded (or user requests re-onboarding):
   - follow `onboarding/discovery.md`
   - use `onboarding/references/data-source-api.md` when building API payloads
   - discover/map databases and status values
   - update `databases/*.md` mappings
   - persist onboarding result to `onboarding/state.json`
3. Load `databases/*.md` files to resolve IDs and field conventions.
4. Validate auth and Notion API reachability.
5. Execute required queries for requested context window.
6. Normalize output into concise summaries (not raw dumps).
7. On write requests, validate schema mapping before update.
8. Return `provider_status` and explicit failure reason when degraded.

## Core Decision Branches

- **Read-only request** -> query active + stale + recently completed signals.
- **Write/update request** -> apply update with schema-safe field mapping.
- **Auth/schema failure** -> return actionable error with missing key/database.

## Output Contract

- `projects_summary`
- `active_tasks_summary`
- `stale_risks`
- `completion_trend`
- `provider_status`

## Gotchas

1. Keep one canonical auth source only; avoid duplicate keys across skills.
2. Resolve DB IDs from `databases/*.md`, not hardcoded inline.
3. Return concise summaries unless raw JSON is explicitly requested.
4. Re-run onboarding when status labels or property names change.
