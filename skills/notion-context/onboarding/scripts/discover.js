#!/usr/bin/env node
/**
 * Notion Workspace Discovery Script
 *
 * Discovers all databases, inspects properties, detects status values,
 * and writes a mapping config for smart context fetching.
 *
 * Usage:
 *   node discover.js [--out path/to/notion-mapping.json]
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const DEFAULT_STATE = path.join(__dirname, '..', 'state.json');
const NOTION_KEY = process.env.NOTION_API_KEY || process.env.OPENCLAW_NOTION_API_KEY;
const NOTION_VERSION = process.env.NOTION_VERSION || '2022-06-28';
const DEFAULT_OUT = path.join(process.cwd(), 'config', 'notion-mapping.json');

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`Usage:
  node discover.js
  node discover.js --out=/tmp/notion-mapping.json
  node discover.js --state=${DEFAULT_STATE}
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

function guessType(title) {
  const t = title.toLowerCase();
  if (/task|todo|inbox|action/.test(t)) return 'tasks';
  if (/project|initiative/.test(t)) return 'projects';
  if (/goal|kpi|okr|objective/.test(t)) return 'goals';
  if (/contact|crm|people|person/.test(t)) return 'crm';
  if (/resource|doc|note/.test(t)) return 'resources';
  return 'other';
}

function pickTitleProperty(schema) {
  for (const [key, value] of Object.entries(schema)) {
    if (value.type === 'title') {
      return key;
    }
  }
  return null;
}

function pickPreferredDateProperty(schema) {
  const dateEntries = Object.entries(schema).filter(([, value]) => value.type === 'date');
  const preferredNames = ['date', 'due', 'deadline', 'scheduled', 'week', 'when'];

  for (const preferred of preferredNames) {
    const match = dateEntries.find(([key]) => key.toLowerCase() === preferred);
    if (match) {
      return match[0];
    }
  }

  for (const preferred of preferredNames) {
    const match = dateEntries.find(([key]) => key.toLowerCase().includes(preferred));
    if (match) {
      return match[0];
    }
  }

  return dateEntries[0]?.[0] || null;
}

async function inspectDatabase(dbId) {
  // Query first page to inspect actual property values
  const result = await notionRequest(`/databases/${dbId}/query`, 'POST', { page_size: 1 });
  if (!result.results || result.results.length === 0) {
    return null;
  }

  const page = result.results[0];
  const props = page.properties;

  const dbInfo = await notionRequest(`/databases/${dbId}`);
  const schema = dbInfo.properties;

  // Find status property (prefer Status/State names, then fall back to first status/select)
  let statusProp = null;
  let statusType = null;
  let statusOptions = [];

  for (const [key, val] of Object.entries(schema)) {
    if ((val.type === 'status' || val.type === 'select') && /status|state/i.test(key)) {
      statusProp = key;
      statusType = val.type;
      break;
    }
  }

  if (!statusProp) {
    for (const [key, val] of Object.entries(schema)) {
      if (val.type === 'status' || val.type === 'select') {
        statusProp = key;
        statusType = val.type;
        break;
      }
    }
  }

  const titleProp = pickTitleProperty(schema);
  const dateProp = pickPreferredDateProperty(schema);

  if (statusProp && schema[statusProp]) {
    const prop = schema[statusProp];
    if (prop.status) {
      statusOptions = prop.status.options.map((o) => o.name);
    } else if (prop.select) {
      statusOptions = prop.select.options.map((o) => o.name);
    }
  }

  // Determine "done" values
  const donePatterns = /^\s*(done|completed|closed|archived|finished|cancelled|canceled)/i;
  const doneValues = statusOptions.filter((o) => donePatterns.test(o));

  return {
    id: dbId,
    title: dbInfo.title?.map((t) => t.plain_text).join('') || 'Untitled',
    guess: guessType(dbInfo.title?.map((t) => t.plain_text).join('') || ''),
    title_property: titleProp,
    status_property: statusProp,
    status_type: statusType,
    status_options: statusOptions,
    done_values: doneValues,
    date_property: dateProp,
    url: dbInfo.url
  };
}

async function main() {
  const outPath = process.argv.find((a) => a.startsWith('--out='))?.split('=')[1] || DEFAULT_OUT;
  const statePath = process.argv.find((a) => a.startsWith('--state='))?.split('=')[1] || DEFAULT_STATE;

  console.log('Searching for Notion databases...\n');

  // Search for all databases
  const searchResult = await notionRequest('/search', 'POST', {
    filter: { value: 'database', property: 'object' },
    page_size: 100
  });

  const databases = searchResult.results || [];
  console.log(`Found ${databases.length} database(s)\n`);

  if (databases.length === 0) {
    console.log('No databases found. Make sure your integration has access to pages/databases.');
    process.exit(0);
  }

  // Inspect each database
  const sources = {};
  const inspected = [];

  for (const db of databases) {
    try {
      console.log(`Inspecting: ${db.title?.map((t) => t.plain_text).join('') || 'Untitled'}`);
      const info = await inspectDatabase(db.id);
      if (info) {
        inspected.push(info);
        console.log(`   Status: ${info.status_property || 'none'} (${info.status_type || 'n/a'})`);
        console.log(`   Done values: [${info.done_values.join(', ') || 'none detected'}]`);
        console.log(`   Date: ${info.date_property || 'none'}\n`);
      }
    } catch (err) {
      console.error(`   Failed to inspect: ${err.message}\n`);
    }
  }

  // Build mapping - use best guess for each type
  const typePriority = ['tasks', 'projects', 'goals', 'crm', 'resources'];
  for (const type of typePriority) {
    const candidates = inspected.filter((i) => i.guess === type);
    if (candidates.length > 0) {
      // Prefer databases with status properties
      const withStatus = candidates.find((c) => c.status_property);
      sources[type] = withStatus || candidates[0];
    }
  }

  // Also include all inspected for reference
  const timestamp = new Date().toISOString();
  const mapping = {
    version: '1.0.0',
    timestamp,
    sources,
    all_databases: inspected
  };

  // Ensure directory exists
  const dir = path.dirname(outPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const stateDir = path.dirname(statePath);
  if (!fs.existsSync(stateDir)) {
    fs.mkdirSync(stateDir, { recursive: true });
  }

  fs.writeFileSync(outPath, JSON.stringify(mapping, null, 2));
  fs.writeFileSync(statePath, JSON.stringify({
    completed: Boolean(sources.tasks && sources.projects && sources.goals),
    lastRunAt: timestamp,
    sources,
    all_databases: inspected
  }, null, 2));
  console.log(`Mapping written to: ${outPath}`);
  console.log(`State written to: ${statePath}`);
  console.log('\nDetected sources:');
  for (const [type, src] of Object.entries(sources)) {
    console.log(`   ${type}: ${src.title} (${src.id})`);
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
