# Notion Onboarding Reference

Use this reference when `metadata.internal.onboarding.completed` is false or when remapping is requested.

## Phase 1: Discovery

1. Search Notion for databases (`/v1/search`, object type `database`).
2. Inspect each candidate database schema and sample rows.
3. Categorize common sources:
   - Task/Inbox/Todo -> `tasks`
   - Project -> `projects`
   - Goal/KPI/OKR -> `goals`
4. Capture status options (for example `Done`, `Completed`, `Closed`) per database.
5. Record date/relation property names used for filtering and linking.

## Phase 2: Mapping

1. Write or update `databases/tasks.md`, `databases/projects.md`, and `databases/goals.md`.
2. Keep field names and status values explicit; do not hardcode assumptions in prompts.
3. Persist discovery state into `onboarding/state.json` with timestamp and mapped sources.

## Phase 3: Validation

1. Run a small read query on each mapped database.
2. Confirm active-item and completed-item filters return expected rows.
3. If a mapping fails, mark onboarding as incomplete and return actionable remediation details.
