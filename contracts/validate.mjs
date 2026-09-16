#!/usr/bin/env node
// Dependency-free validator for contracts/examples/*.json against contracts/*.schema.json.
// It implements only the JSON Schema subset these contracts use: type, required, properties,
// const, enum, pattern, minimum, minLength, maxLength, format (uuid / date-time), allOf, $ref (sibling file).
// Usage: node contracts/validate.mjs            (exit 1 on any violation)
//        node contracts/validate.mjs some.json  (validate one envelope file; schema picked from its "type")
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const loadJson = (file) => JSON.parse(readFileSync(file, 'utf8'));
const schemaCache = new Map();
const schema = (name) => {
  if (!schemaCache.has(name)) schemaCache.set(name, loadJson(join(here, name)));
  return schemaCache.get(name);
};

const FORMATS = {
  uuid: (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s),
  'date-time': (s) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(s),
};

function typeOf(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'number';
  return typeof value;
}

// Returns a list of "path: problem" strings; empty means valid.
function validate(value, node, path = '$') {
  const errors = [];
  if (node.$ref) errors.push(...validate(value, schema(node.$ref), path));
  for (const sub of node.allOf ?? []) errors.push(...validate(value, sub, path));

  if (node.type) {
    const actual = typeOf(value);
    const ok = node.type === 'number' ? actual === 'number' || actual === 'integer' : actual === node.type;
    if (!ok) errors.push(`${path}: expected ${node.type}, got ${actual}`);
  }
  if ('const' in node && JSON.stringify(value) !== JSON.stringify(node.const)) errors.push(`${path}: must equal ${JSON.stringify(node.const)}`);
  if (node.enum && !node.enum.some((v) => JSON.stringify(v) === JSON.stringify(value))) errors.push(`${path}: must be one of ${node.enum.join(', ')}`);
  if (typeof value === 'string') {
    if (node.pattern && !new RegExp(node.pattern).test(value)) errors.push(`${path}: "${value}" does not match ${node.pattern}`);
    if (node.minLength !== undefined && value.length < node.minLength) errors.push(`${path}: shorter than ${node.minLength}`);
    if (node.maxLength !== undefined && value.length > node.maxLength) errors.push(`${path}: longer than ${node.maxLength}`);
    if (node.format && FORMATS[node.format] && !FORMATS[node.format](value)) errors.push(`${path}: "${value}" is not a valid ${node.format}`);
  }
  if (typeof value === 'number' && node.minimum !== undefined && value < node.minimum) errors.push(`${path}: below minimum ${node.minimum}`);
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const key of node.required ?? []) if (!(key in value)) errors.push(`${path}: missing required "${key}"`);
    for (const [key, sub] of Object.entries(node.properties ?? {})) if (key in value) errors.push(...validate(value[key], sub, `${path}.${key}`));
  }
  return errors;
}

const files = process.argv.length > 2
  ? process.argv.slice(2)
  : readdirSync(join(here, 'examples')).filter((f) => f.endsWith('.json')).map((f) => join(here, 'examples', f));

let failed = 0;
for (const file of files) {
  const event = loadJson(file);
  const schemaName = `${event.type}.schema.json`;
  let errors;
  try {
    errors = validate(event, schema(schemaName));
  } catch (e) {
    errors = [`no schema for type "${event.type}" (${e.message})`];
  }
  if (errors.length === 0) console.log(`ok    ${file} -> ${schemaName}`);
  else {
    failed++;
    console.log(`FAIL  ${file}`);
    for (const err of errors) console.log(`      ${err}`);
  }
}
console.log(failed === 0 ? `\n${files.length} example(s) valid.` : `\n${failed} of ${files.length} example(s) invalid.`);
process.exit(failed === 0 ? 0 : 1);
