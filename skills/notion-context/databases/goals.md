# Notion Database: Goals

## Env Mapping

- `NOTION_DB_GOALS`

## Purpose

Track long-horizon goals and strategic outcomes.

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

1. Active goals
2. Goals with no recent updates
3. Goal progress trend
4. Completed goals

## Common Writes

1. Update status/progress
2. Link related projects

## Canonical Views

Name: `goals-active`

Filter:

- exclude all mapped `done_values`

Sort:

1. `last_edited_time` descending

Name: `goals-completed`

Filter:

- include all mapped `done_values`

Sort:

1. `last_edited_time` descending
