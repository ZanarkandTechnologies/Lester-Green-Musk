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
5. Record the title property and preferred date property used for filtering.
6. Record relation property names used for linking.

## Phase 2: Mapping

1. Write or update `databases/tasks.md`, `databases/projects.md`, and `databases/goals.md`.
2. Keep field names and status values explicit; do not hardcode assumptions in prompts.
3. Persist discovery state into `onboarding/state.json` with timestamp and mapped sources.
4. Mark onboarding complete only after tasks, projects, and goals can all be mapped or intentionally documented as unavailable.

## Phase 3: Validation

1. Run a small read query on each mapped database.
2. Confirm active-item and completed-item filters return expected rows.
3. Confirm the `tasks-this-week` view can be filtered against the mapped weekly date field or a documented fallback.
4. If a mapping fails, mark onboarding as incomplete and return actionable remediation details.
