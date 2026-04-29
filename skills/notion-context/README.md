# Notion Context

Purpose: read life-system context from Notion and normalize it into concise,
usable summaries for goals, projects, and weekly tasks.

Public entrypoints:

- `node skills/notion-context/onboarding/scripts/discover.js`
- `node skills/notion-context/onboarding/scripts/fetch-context.js --view=tasks-this-week`
- `node skills/notion-context/onboarding/scripts/fetch-context.js --view=life-context`

Minimal examples:

```bash
node skills/notion-context/onboarding/scripts/discover.js
node skills/notion-context/onboarding/scripts/fetch-context.js --view=tasks-this-week
node skills/notion-context/onboarding/scripts/fetch-context.js --view="fetched tasks from this week"
```

Named views:

- `tasks-this-week`: all tasks in the current week, grouped by status
- `projects-active`: projects not in a done state
- `projects-completed`: projects in a done state
- `goals-active`: goals not in a done state
- `goals-completed`: goals in a done state
- `life-context`: combined fetch for weekly tasks plus active/completed goals and projects

How to test:

```bash
node --check skills/notion-context/onboarding/scripts/discover.js
node --check skills/notion-context/onboarding/scripts/fetch-context.js
node skills/notion-context/onboarding/scripts/fetch-context.js --help
```
