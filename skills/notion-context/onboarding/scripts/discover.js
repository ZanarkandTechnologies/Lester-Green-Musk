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

const NOTION_KEY = process.env.NOTION_API_KEY || process.env.OPENCLAW_NOTION_API_KEY;
const NOTION_VERSION = process.env.NOTION_VERSION || '2022-06-28';
const DEFAULT_OUT = path.join(process.cwd(), 'config', 'notion-mapping.json');

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

async function inspectDatabase(dbId) {
  // Query first page to inspect actual property values
  const result = await notionRequest(`/databases/${dbId}/query`, 'POST', { page_size: 1 });
  if (!result.results || result.results.length === 0) {
    return null;
  }

  const page = result.results[0];
  const props = page.properties;

  // Find status property (could be named Status, State, or be status/select type)
  let statusProp = null;
  let statusType = null;
  let statusOptions = [];

  for (const [key, val] of Object.entries(props)) {
    if (val.type === 'status' || val.type === 'select') {
      statusProp = key;
      statusType = val.type;
      // Get options from the database schema, not the page
      break;
    }
  }

  // Find date property
  let dateProp = null;
  for (const [key, val] of Object.entries(props)) {
    if (val.type === 'date') {
      dateProp = key;
      break;
    }
  }

  // Get full database schema for status options
  const dbInfo = await notionRequest(`/databases/${dbId}`);
  const schema = dbInfo.properties;

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
  const mapping = {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    sources,
    all_databases: inspected
  };

  // Ensure directory exists
  const dir = path.dirname(outPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outPath, JSON.stringify(mapping, null, 2));
  console.log(`Mapping written to: ${outPath}`);
  console.log('\nDetected sources:');
  for (const [type, src] of Object.entries(sources)) {
    console.log(`   ${type}: ${src.title} (${src.id})`);
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
