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

const NOTION_KEY = process.env.NOTION_API_KEY || process.env.OPENCLAW_NOTION_API_KEY;
const NOTION_VERSION = process.env.NOTION_VERSION || '2022-06-28';
const DEFAULT_MAPPING = path.join(process.cwd(), 'config', 'notion-mapping.json');
const DEFAULT_OUT = path.join(process.cwd(), 'context', 'notion-context.json');

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

function buildFilter(dbConfig, type) {
  const { status_property, status_type, done_values, date_property } = dbConfig;
  const filters = [];

  if (!status_property || done_values.length === 0) {
    return null; // No status filtering possible
  }

  // Build NOT Done filter
  if (status_type === 'status') {
    // New status type - use status filter
    filters.push({
      property: status_property,
      status: {
        does_not_equal: done_values[0] // API limitation: one at a time or use compound
      }
    });
  } else {
    // Legacy select type
    filters.push({
      property: status_property,
      select: {
        does_not_equal: done_values[0]
      }
    });
  }

  // For tasks, add recency filter
  if (type === 'tasks') {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    if (date_property) {
      // Has date property - filter to this week or recent
      filters.push({
        property: date_property,
        date: {
          on_or_after: sevenDaysAgo.toISOString().split('T')[0]
        }
      });
    }
    // Also apply recency via last_edited_time sort
  }

  return filters.length === 1 ? filters[0] : { and: filters };
}

async function fetchDatabase(dbConfig, type) {
  const filter = buildFilter(dbConfig, type);

  const queryBody = {
    page_size: 100,
    sorts: [
      { timestamp: 'last_edited_time', direction: 'descending' }
    ]
  };

  if (filter) {
    queryBody.filter = filter;
  }

  const result = await notionRequest(`/databases/${dbConfig.id}/query`, 'POST', queryBody);

  return {
    type,
    database_id: dbConfig.id,
    database_title: dbConfig.title,
    total: result.results?.length || 0,
    has_more: result.has_more || false,
    items: result.results?.map((page) => ({
      id: page.id,
      title: page.properties?.Name?.title?.map((t) => t.plain_text).join('') ||
             page.properties?.Title?.title?.map((t) => t.plain_text).join('') ||
             'Untitled',
      status: page.properties?.[dbConfig.status_property]?.[dbConfig.status_type]?.name || null,
      url: page.url,
      last_edited: page.last_edited_time
    })) || []
  };
}

async function main() {
  const mappingPath = process.argv.find((a) => a.startsWith('--mapping='))?.split('=')[1] || DEFAULT_MAPPING;
  const outPath = process.argv.find((a) => a.startsWith('--out='))?.split('=')[1] || DEFAULT_OUT;

  if (!fs.existsSync(mappingPath)) {
    console.error(`Mapping file not found: ${mappingPath}`);
    console.error('Run discover.js first to create the mapping.');
    process.exit(1);
  }

  const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));

  console.log('Fetching Notion context...\n');

  const context = {
    timestamp: new Date().toISOString(),
    sources: {}
  };

  for (const [type, dbConfig] of Object.entries(mapping.sources)) {
    try {
      console.log(`Fetching ${type} from "${dbConfig.title}"...`);
      const data = await fetchDatabase(dbConfig, type);
      context.sources[type] = data;
      console.log(`   ${data.total} items\n`);
    } catch (err) {
      console.error(`   Failed: ${err.message}\n`);
      context.sources[type] = { error: err.message, type, database_id: dbConfig.id };
    }
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
    }
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
