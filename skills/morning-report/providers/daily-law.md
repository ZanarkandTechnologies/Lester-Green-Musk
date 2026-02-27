# Daily Law Provider (Embedded)

This provider is owned by `morning-report` and is not a standalone skill dependency.

## Data Source

- Base URL: `DAILY_LAW_BASE_URL` (default: `https://acrobatic-cod-574.eu-west-1.convex.site`)
- Today endpoint: `DAILY_LAW_TODAY_PATH` (default: `/today`)
- Date endpoint: `DAILY_LAW_DATE_PATH` (default: `/law?month={month}&day={day}`)

## Provider Workflow

1. Fetch today’s Daily Law payload.
2. Extract:
   - `title`
   - `body`
   - `dailyLaw`
   - `source`
3. Generate 2-3 reflection prompts grounded in current context.
4. Return a compact provider object for templates.

## Output Shape

```json
{
  "title": "<title>",
  "story": "<body>",
  "law": "<dailyLaw>",
  "source": "<source>",
  "reflection_questions": ["q1", "q2", "q3"]
}
```

## Failure Handling

- If provider fetch fails, mark morning report as `degraded`.
- Continue sending other enabled templates.
- Include a concise failure note in the status output.
