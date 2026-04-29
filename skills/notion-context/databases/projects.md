# Notion Database: Projects

## Env Mapping

- `NOTION_DB_PROJECTS`

## Purpose

Track active projects, owners, and delivery state.

## Required Mapping Fields

These should be discovered and persisted to `onboarding/state.json`:

- `id`
- `title`
- `title_property`
- `status_property`
- `status_type`
- `status_options`
- `done_values`
- `date_property`
- `url`

## Common Reads

1. Active/in-progress projects
2. Blocked projects
3. Projects stale for N days
4. Completed projects

## Common Writes

1. Update status
2. Assign owner
3. Add blocker notes

## Canonical Views

Name: `projects-active`

Filter:

- exclude all mapped `done_values`

Sort:

1. `last_edited_time` descending

Name: `projects-completed`

Filter:

- include all mapped `done_values`

Sort:

1. `last_edited_time` descending
