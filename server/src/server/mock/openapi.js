const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'];

export function resolveRef(spec, ref) {
  if (!ref?.startsWith('#/')) return undefined;
  const parts = ref.slice(2).split('/');
  let current = spec;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }
  return current;
}

export function resolveSchema(spec, schema, depth = 0) {
  if (!schema || depth > 10) return schema;

  if (schema.$ref) {
    const resolved = resolveRef(spec, schema.$ref);
    if (resolved) {
      return {
        ...resolveSchema(spec, resolved, depth + 1),
        description: schema.description ?? resolved.description,
      };
    }
  }

  const result = { ...schema };

  if (result.properties) {
    result.properties = Object.fromEntries(
      Object.entries(result.properties).map(([key, value]) => [
        key,
        resolveSchema(spec, value, depth + 1),
      ]),
    );
  }

  if (result.items) {
    result.items = resolveSchema(spec, result.items, depth + 1);
  }

  if (result.allOf) {
    result.allOf = result.allOf.map((s) => resolveSchema(spec, s, depth + 1));
  }

  if (result.oneOf) {
    result.oneOf = result.oneOf.map((s) => resolveSchema(spec, s, depth + 1));
  }

  if (result.anyOf) {
    result.anyOf = result.anyOf.map((s) => resolveSchema(spec, s, depth + 1));
  }

  return result;
}

function resolveResponse(spec, response) {
  if (!response?.$ref) return response;
  const resolved = resolveRef(spec, response.$ref);
  return resolved && typeof resolved === 'object' ? resolved : response;
}

function pickJsonContent(content) {
  if (content['application/json']?.schema) return content['application/json'];
  for (const [type, media] of Object.entries(content)) {
    if (type.includes('json') && media.schema) return media;
  }
  if (content['*/*']?.schema) return content['*/*'];
  return Object.values(content).find((c) => c.schema);
}

export function getResponseJsonSchema(spec, operation) {
  const raw =
    operation.responses?.['200'] ??
    operation.responses?.['201'] ??
    operation.responses?.default;

  if (!raw) return null;

  const response = resolveResponse(spec, raw);
  if (!response?.content) return null;

  return pickJsonContent(response.content)?.schema ?? null;
}

export function buildDefaultFieldRules(schema) {
  const rules = {};
  if (schema?.properties?.code) rules.code = { mode: 'fixed', value: 0 };
  if (schema?.properties?.msg) rules.msg = { mode: 'fixed', value: '' };
  return rules;
}

export function collectMockableEndpoints(spec) {
  if (!spec?.paths) return [];

  const list = [];
  for (const [path, pathItem] of Object.entries(spec.paths)) {
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (!operation) continue;
      const raw = getResponseJsonSchema(spec, operation);
      if (!raw) continue;
      list.push({
        path,
        method,
        responseSchema: resolveSchema(spec, raw),
      });
    }
  }
  return list;
}

export function endpointRouteKey(method, path) {
  return `${String(method).toLowerCase()}:${path}`;
}
