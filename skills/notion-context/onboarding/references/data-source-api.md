# Notion Data Source API Reference

## Key Endpoints

### 1. Search for Databases
```
POST /v1/search
{
  "filter": {"value":"database","property":"object"},
  "page_size": 100
}
```

### 2. Query Database (legacy - works for all)
```
POST /v1/databases/{database_id}/query
{
  "filter": {...},
  "sorts": [...],
  "page_size": 100
}
```

### 3. Query Data Source (new - for larger databases)
```
POST /v1/databases/{database_id}/query
{
  "filter": {...}
}
```

## Common Filter Patterns

### Status is NOT Done
```json
{
  "property": "Status",
  "status": {"does_not_equal": "Done"}
}
```

### Date is this week
```json
{
  "property": "Due",
  "date": {"on_or_after": "2026-02-20"}
}
```

### Compound filter (AND)
```json
{
  "and": [
    {"property": "Status", "status": {"does_not_equal": "Done"}},
    {"property": "Due", "date": {"on_or_after": "2026-02-20"}}
  ]
}
```

## Property Types to Check

- `status` - New Notion status property (has built-in options)
- `select` - Legacy single-select (similar to status)
- `multi_select` - Multiple tags
- `date` - Date with optional end date
- `relation` - Link to other database
- `rollup` - Aggregated data from relation

## Common Status Values

Always inspect actual options, but common patterns:
- `Not started`, `In progress`, `Done`
- `Todo`, `Doing`, `Done`
- `Backlog`, `In Progress`, `Completed`
- `Open`, `Closed`

## Tips

1. Check `database.properties` to see schema vs `page.properties` for values
2. Handle pagination with `start_cursor` if `has_more: true`
3. Rate limit: ~3 requests per second
4. Use `last_edited_time` sort for "recent" without date filters
