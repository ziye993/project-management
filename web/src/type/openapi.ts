export interface OpenAPISpec {
  openapi: string
  info: {
    title: string
    version: string
    description?: string
  }
  servers?: Array<{ url: string; description?: string }>
  paths: Record<string, PathItem>
  components?: {
    schemas?: Record<string, SchemaObject>
    securitySchemes?: Record<string, SecurityScheme>
  }
  security?: Array<Record<string, string[]>>
}

export interface PathItem {
  get?: Operation
  post?: Operation
  put?: Operation
  delete?: Operation
  patch?: Operation
  head?: Operation
  options?: Operation
}

export interface Operation {
  tags?: string[]
  summary?: string
  description?: string
  operationId?: string
  parameters?: Parameter[]
  requestBody?: RequestBody
  responses: Record<string, Response>
  security?: Array<Record<string, string[]>>
}

export interface Parameter {
  name: string
  in: string
  description?: string
  required?: boolean
  schema?: SchemaObject
}

export interface RequestBody {
  description?: string
  required?: boolean
  content: Record<string, MediaType>
}

export interface MediaType {
  schema?: SchemaObject
  examples?: Record<string, { summary?: string; value?: unknown }>
}

export interface Response {
  description: string
  content?: Record<string, MediaType>
}

export interface SchemaObject {
  $ref?: string
  type?: string
  format?: string
  description?: string
  properties?: Record<string, SchemaObject>
  items?: SchemaObject
  required?: string[]
  enum?: unknown[]
  allOf?: SchemaObject[]
  oneOf?: SchemaObject[]
  anyOf?: SchemaObject[]
  additionalProperties?: SchemaObject | boolean
}

export interface SecurityScheme {
  type: string
  name?: string
  in?: string
  scheme?: string
}

export interface ParsedEndpoint {
  path: string
  method: string
  operation: Operation
}
