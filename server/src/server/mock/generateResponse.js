import { resolveGlobalFieldDefault } from './fieldDefaults.js';

const DEFAULT_ARRAY_LENGTH = 5;

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomString() {
  const words = ['alpha', 'beta', 'gamma', 'delta', 'mock', 'sample', 'test'];
  return `${pickRandom(words)}_${Math.random().toString(36).slice(2, 8)}`;
}

function randomNumber(type) {
  const n = Math.floor(Math.random() * 1000);
  return type === 'integer' ? n : Number((Math.random() * 1000).toFixed(2));
}

function randomBoolean() {
  return Math.random() > 0.5;
}

function getRule(fieldRules, path) {
  return fieldRules?.[path];
}

function getArrayLength(arrayLengths, path) {
  const len = arrayLengths?.[`${path}[]`];
  return typeof len === 'number' && len >= 0 ? len : DEFAULT_ARRAY_LENGTH;
}

function applyRule(rule, schema, arrayIndex) {
  if (!rule || rule.mode === 'default' || rule.mode === 'random') {
    return null;
  }

  if (rule.mode === 'fixed') {
    return rule.value;
  }

  if (rule.mode === 'increment') {
    const start = typeof rule.start === 'number' ? rule.start : 1;
    return start + (arrayIndex ?? 0);
  }

  if (rule.mode === 'now') {
    return new Date().toISOString();
  }

  if (rule.mode === 'timeOffset') {
    const hours = typeof rule.offsetHours === 'number' ? rule.offsetHours : 1;
    const d = new Date();
    d.setHours(d.getHours() + (arrayIndex ?? 0) * hours);
    return d.toISOString();
  }

  return null;
}

function randomValue(schema, depth = 0) {
  if (depth > 12) return null;

  if (schema.example !== undefined) return schema.example;
  if (schema.default !== undefined) return schema.default;

  if (schema.enum?.length) {
    return pickRandom(schema.enum);
  }

  switch (schema.type) {
    case 'string':
      if (schema.format === 'date-time') return new Date().toISOString();
      if (schema.format === 'date') return new Date().toISOString().slice(0, 10);
      if (schema.format === 'uuid') return '00000000-0000-4000-8000-000000000001';
      return randomString();
    case 'integer':
    case 'number':
      return randomNumber(schema.type);
    case 'boolean':
      return randomBoolean();
    case 'array':
      return [];
    case 'object':
    default:
      return {};
  }
}

function mergeAllOf(schemas) {
  const merged = { type: 'object', properties: {}, required: [] };
  for (const part of schemas) {
    if (part.properties) {
      merged.properties = { ...merged.properties, ...part.properties };
    }
    if (part.required) {
      merged.required = [...new Set([...merged.required, ...part.required])];
    }
  }
  return merged;
}

function generateFromSchema(schema, ctx) {
  const { fieldRules, arrayLengths, globalDefaults, path = '', arrayIndex = null } = ctx;
  if (!schema || typeof schema !== 'object') return null;

  if (schema.allOf?.length) {
    return generateFromSchema(mergeAllOf(schema.allOf), ctx);
  }

  if (schema.oneOf?.length) {
    return generateFromSchema(schema.oneOf[0], ctx);
  }

  if (schema.anyOf?.length) {
    return generateFromSchema(schema.anyOf[0], ctx);
  }

  const rule = getRule(fieldRules, path);
  const ruled = applyRule(rule, schema, arrayIndex);
  if (ruled !== null) return ruled;

  const globalVal = resolveGlobalFieldDefault(path, globalDefaults, schema);
  if (globalVal !== undefined) return globalVal;

  if (schema.type === 'array' || schema.items) {
    const length = getArrayLength(arrayLengths, path);
    const items = [];
    for (let i = 0; i < length; i += 1) {
      const itemPath = path ? `${path}[]` : '[]';
      items.push(
        generateFromSchema(schema.items ?? { type: 'object' }, {
          ...ctx,
          path: itemPath,
          arrayIndex: i,
        }),
      );
    }
    return items;
  }

  if (schema.properties || schema.type === 'object' || (!schema.type && schema.properties)) {
    const obj = {};
    for (const [key, prop] of Object.entries(schema.properties ?? {})) {
      const childPath = path ? `${path}.${key}` : key;
      obj[key] = generateFromSchema(prop, { ...ctx, path: childPath, arrayIndex });
    }
    return obj;
  }

  return randomValue(schema);
}

export function generateResponse(responseSchema, { fieldRules = {}, arrayLengths = {}, globalDefaults = null } = {}) {
  return generateFromSchema(responseSchema, { fieldRules, arrayLengths, globalDefaults });
}

export function resolveMockBody(session, globalDefaults = null) {
  if (session.staticResponse !== undefined) {
    return session.staticResponse;
  }
  return generateResponse(session.responseSchema, {
    fieldRules: session.fieldRules ?? {},
    arrayLengths: session.arrayLengths ?? {},
    globalDefaults,
  });
}
