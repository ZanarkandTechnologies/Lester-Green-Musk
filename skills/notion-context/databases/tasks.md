# Notion Database: Tasks

## Env Mapping

- `NOTION_DB_TASKS`

## Purpose

Track execution tasks, weekly workload, and completion momentum.

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

## Expected Statuses

The weekly task view should preserve these buckets when present:

- `backlog`
- `not started`
- `in progress`
- `done`

If the workspace uses different labels, discovery should capture the actual
labels and the fetch layer should still normalize the weekly summary around the
real options.

## Common Reads

1. Active tasks
2. Tasks from this week
3. Stale tasks (no recent activity)
4. Completed tasks in last N hours

## Canonical Weekly View

Name: `tasks-this-week`

Filter:

- Prefer the mapped `date_property`
- Include tasks whose date falls between the start and end of the current week
- If no date property is mapped, fall back to `last_edited_time` within the current week
- Do not exclude `done`; this view is meant to show the whole week

Sort:

1. Weekly date ascending when available
2. `last_edited_time` descending

Output:

- grouped counts by status
- concise task list with title, status, date, and last edited time
- a summary header that can be presented as `Fetched tasks from this week`

## Common Writes

1. Update status
2. Set due date/priority
3. Add continuation notes when splitting large tasks
