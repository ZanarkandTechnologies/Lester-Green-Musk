#!/usr/bin/env node
/**
 * Smart Context Fetcher for Notion
 *
 * Loads mapping config and fetches context with smart filters:
 * - Tasks: not done, recent (last 7 days or has due date this week)
 * - Projects/Goals: not done (active)
 *
 * Usage:
 *   node fetch-context.js [--mapping path/to/notion-mapping.json] [--out path/to/context.json]
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const DEFAULT_STATE = path.join(__dirname, '..', 'state.json');
const NOTION_KEY = process.env.NOTION_API_KEY || process.env.OPENCLAW_NOTION_API_KEY;
const NOTION_VERSION = process.env.NOTION_VERSION || '2022-06-28';
const DEFAULT_MAPPING = path.join(process.cwd(), 'config', 'notion-mapping.json');
const DEFAULT_OUT = path.join(process.cwd(), 'context', 'notion-context.json');

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`Usage:
  node fetch-context.js --view=tasks-this-week
  node fetch-context.js --view="fetched tasks from this week"
  node fetch-context.js --view=life-context
  node fetch-context.js --state=${DEFAULT_STATE}
  node fetch-context.js --mapping=${DEFAULT_MAPPING}
`);
  process.exit(0);
}

if (!NOTION_KEY) {
  console.error('Error: NOTION_API_KEY not set');
  process.exit(1);
}

function notionRequest(endpoint, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.notion.com',
      port: 443,
      path: `/v1${endpoint}`,
      method,
      headers: {
        'Authorization': `Bearer ${NOTION_KEY}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.object === 'error') {
            reject(new Error(`Notion API error: ${json.status} ${json.code} - ${json.message}`));
          } else {
            resolve(json);
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function normalizeViewName(input) {
  const normalized = String(input || 'life-context')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const aliases = {
    'tasks-this-week': 'tasks-this-week',
    'task-this-week': 'tasks-this-week',
    'fetched-tasks-from-this-week': 'tasks-this-week',
    'fetch-tasks-from-this-week': 'tasks-this-week',
    'projects-active': 'projects-active',
    'active-projects': 'projects-active',
    'projects-completed': 'projects-completed',
    'completed-projects': 'projects-completed',
    'goals-active': 'goals-active',
    'active-goals': 'goals-active',
    'goals-completed': 'goals-completed',
    'completed-goals': 'goals-completed',
    'life-context': 'life-context'
  };

  return aliases[normalized] || normalized;
}

function startOfWeek(date) {
  const next = new Date(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() + diff);
  return next;
}

function endOfWeek(date) {
  const next = startOfWeek(date);
  next.setDate(next.getDate() + 6);
  next.setHours(23, 59, 59, 999);
  return next;
}

function isoDate(date) {
  return date.toISOString().split('T')[0];
}

function buildStatusCondition(dbConfig, operator, value) {
  if (dbConfig.status_type === 'status') {
    return {
      property: dbConfig.status_property,
      status: {
        [operator]: value
      }
    };
  }

  return {
    property: dbConfig.status_property,
    select: {
      [operator]: value
    }
  };
}

function buildDoneFilter(dbConfig, includeDone) {
  const doneValues = dbConfig.done_values || [];
  if (!dbConfig.status_property || doneValues.length === 0) {
    return null;
  }

  const conditions = doneValues.map((value) =>
    buildStatusCondition(dbConfig, includeDone ? 'equals' : 'does_not_equal', value)
  );

  if (conditions.length === 1) {
    return conditions[0];
  }

  return includeDone ? { or: conditions } : { and: conditions };
}

function buildWeekFilter(dbConfig, now) {
  const weekStart = startOfWeek(now);
  const weekEnd = endOfWeek(now);

  if (dbConfig.date_property) {
    return {
      and: [
        {
          property: dbConfig.date_property,
          date: {
            on_or_after: isoDate(weekStart)
          }
        },
        {
          property: dbConfig.date_property,
          date: {
            on_or_before: isoDate(weekEnd)
          }
        }
      ]
    };
  }

  return {
    and: [
      {
        timestamp: 'last_edited_time',
        last_edited_time: {
          on_or_after: weekStart.toISOString()
        }
      },
      {
        timestamp: 'last_edited_time',
        last_edited_time: {
          on_or_before: weekEnd.toISOString()
        }
      }
    ]
  };
}

function buildFilter(dbConfig, viewName, now) {
  if (!dbConfig.status_property && !dbConfig.date_property) {
    return null;
  }

  if (viewName === 'tasks-this-week') {
    return buildWeekFilter(dbConfig, now);
  }

  if (viewName.endsWith('-active')) {
    return buildDoneFilter(dbConfig, false);
  }

  if (viewName.endsWith('-completed')) {
    return buildDoneFilter(dbConfig, true);
  }

  return null;
}

function buildSorts(dbConfig, viewName) {
  if (viewName === 'tasks-this-week' && dbConfig.date_property) {
    return [
      { property: dbConfig.date_property, direction: 'ascending' },
      { timestamp: 'last_edited_time', direction: 'descending' }
    ];
  }

  return [
    { timestamp: 'last_edited_time', direction: 'descending' }
  ];
}

function getPropertyValue(page, propertyName) {
  return propertyName ? page.properties?.[propertyName] || null : null;
}

function getTitle(page, dbConfig) {
  const titleProperty = getPropertyValue(page, dbConfig.title_property);
  if (titleProperty?.type === 'title') {
    return titleProperty.title.map((token) => token.plain_text).join('') || 'Untitled';
  }

  return page.properties?.Name?.title?.map((t) => t.plain_text).join('') ||
    page.properties?.Title?.title?.map((t) => t.plain_text).join('') ||
    'Untitled';
}

function getStatus(page, dbConfig) {
  const property = getPropertyValue(page, dbConfig.status_property);
  if (!property) {
    return null;
  }

  if (property.type === 'status') {
    return property.status?.name || null;
  }

  if (property.type === 'select') {
    return property.select?.name || null;
  }

  return null;
}

function getDate(page, dbConfig) {
  const property = getPropertyValue(page, dbConfig.date_property);
  if (!property || property.type !== 'date') {
    return null;
  }
  return property.date?.start || null;
}

async function fetchDatabase(dbConfig, type, viewName, now) {
  const filter = buildFilter(dbConfig, viewName, now);

  const queryBody = {
    page_size: 100,
    sorts: buildSorts(dbConfig, viewName)
  };

  if (filter) {
    queryBody.filter = filter;
  }

  const result = await notionRequest(`/databases/${dbConfig.id}/query`, 'POST', queryBody);

  return {
    type,
    named_view: viewName,
    database_id: dbConfig.id,
    database_title: dbConfig.title,
    total: result.results?.length || 0,
    has_more: result.has_more || false,
    items: result.results?.map((page) => ({
      id: page.id,
      title: getTitle(page, dbConfig),
      status: getStatus(page, dbConfig),
      date: getDate(page, dbConfig),
      url: page.url,
      last_edited: page.last_edited_time
    })) || []
  };
}

function summarizeStatusGroups(items) {
  const groups = {};
  for (const item of items) {
    const key = (item.status || 'unknown').toLowerCase();
    groups[key] = (groups[key] || 0) + 1;
  }
  return groups;
}

function buildSummary(viewName, sourceData, now) {
  if (viewName === 'tasks-this-week') {
    const weekStart = isoDate(startOfWeek(now));
    const weekEnd = isoDate(endOfWeek(now));
    return {
      named_view: viewName,
      title: 'Fetched tasks from this week',
      data_window: {
        start: weekStart,
        end: weekEnd
      },
      total: sourceData.total,
      status_groups: summarizeStatusGroups(sourceData.items)
    };
  }

  return {
    named_view: viewName,
    total: sourceData.total
  };
}

function buildProjectsSummary(sourceData) {
  if (!sourceData || sourceData.error) {
    return null;
  }

  return {
    total: sourceData.total,
    items: sourceData.items.map((item) => ({
      title: item.title,
      status: item.status,
      url: item.url
    }))
  };
}

function buildActiveTasksSummary(sourceData) {
  if (!sourceData || sourceData.error) {
    return null;
  }

  return {
    total: sourceData.total,
    status_groups: summarizeStatusGroups(sourceData.items),
    items: sourceData.items.map((item) => ({
      title: item.title,
      status: item.status,
      date: item.date,
      url: item.url
    }))
  };
}

function buildFailureReason(context) {
  const failures = Object.entries(context.sources)
    .filter(([, data]) => data?.error)
    .map(([type, data]) => `${type}: ${data.error}`);

  return failures.length > 0 ? failures.join('; ') : null;
}

function loadState(statePath, mappingPath) {
  if (fs.existsSync(statePath)) {
    return JSON.parse(fs.readFileSync(statePath, 'utf8'));
  }

  if (fs.existsSync(mappingPath)) {
    const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
    return {
      completed: Boolean(
        mapping.sources?.tasks || mapping.sources?.projects || mapping.sources?.goals
      ),
      lastRunAt: mapping.timestamp || null,
      sources: mapping.sources || {},
      all_databases: mapping.all_databases || []
    };
  }

  return null;
}

async function main() {
  const statePath = process.argv.find((a) => a.startsWith('--state='))?.split('=')[1] || DEFAULT_STATE;
  const mappingPath = process.argv.find((a) => a.startsWith('--mapping='))?.split('=')[1] || DEFAULT_MAPPING;
  const outPath = process.argv.find((a) => a.startsWith('--out='))?.split('=')[1] || DEFAULT_OUT;
  const requestedView = process.argv.find((a) => a.startsWith('--view='))?.split('=')[1] || 'life-context';
  const viewName = normalizeViewName(requestedView);
  const now = new Date();

  const state = loadState(statePath, mappingPath);
  if (!state) {
    console.error(`State file not found: ${statePath}`);
    console.error(`Mapping file not found: ${mappingPath}`);
    console.error('Run discover.js first to create the mapping and onboarding state.');
    process.exit(1);
  }

  console.log('Fetching Notion context...\n');

  const context = {
    timestamp: now.toISOString(),
    named_view: viewName,
    provider_status: state.completed ? 'ok' : 'degraded',
    data_window: null,
    projects_summary: null,
    active_tasks_summary: null,
    stale_risks: [],
    completion_trend: null,
    failure_reason: null,
    sources: {}
  };

  const viewSourceTypes = {
    'tasks-this-week': ['tasks'],
    'projects-active': ['projects'],
    'projects-completed': ['projects'],
    'goals-active': ['goals'],
    'goals-completed': ['goals'],
    'life-context': ['tasks', 'projects', 'goals']
  };

  const selectedTypes = viewSourceTypes[viewName];
  if (!selectedTypes) {
    console.error(`Unknown view: ${requestedView}`);
    process.exit(1);
  }

  for (const type of selectedTypes) {
    const dbConfig = state.sources?.[type];
    if (!dbConfig) {
      context.sources[type] = {
        type,
        error: `Missing mapped source for ${type}`
      };
      continue;
    }

    try {
      const sourceView =
        viewName === 'life-context'
          ? (type === 'tasks' ? 'tasks-this-week' : `${type}-active`)
          : viewName;
      console.log(`Fetching ${type} from "${dbConfig.title}" using view "${sourceView}"...`);
      const data = await fetchDatabase(dbConfig, type, sourceView, now);
      data.summary = buildSummary(sourceView, data, now);
      context.sources[type] = data;
      console.log(`   ${data.total} items\n`);
    } catch (err) {
      console.error(`   Failed: ${err.message}\n`);
      context.sources[type] = { error: err.message, type, database_id: dbConfig.id };
    }
  }

  const tasksSource = context.sources.tasks;
  const projectsSource = context.sources.projects;

  if (tasksSource?.summary?.data_window) {
    context.data_window = tasksSource.summary.data_window;
  }
  context.projects_summary = buildProjectsSummary(projectsSource);
  context.active_tasks_summary = buildActiveTasksSummary(tasksSource);
  context.failure_reason = buildFailureReason(context);
  if (context.failure_reason) {
    context.provider_status = 'degraded';
  }

  // Ensure output directory exists
  const dir = path.dirname(outPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outPath, JSON.stringify(context, null, 2));
  console.log(`Context written to: ${outPath}`);

  // Summary
  console.log('\nSummary:');
  for (const [type, data] of Object.entries(context.sources)) {
    if (data.error) {
      console.log(`   ${type}: ERROR - ${data.error}`);
    } else {
      console.log(`   ${type}: ${data.total} items`);
      if (data.summary?.title) {
        console.log(`      ${data.summary.title}`);
      }
    }
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
