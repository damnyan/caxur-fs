#!/usr/bin/env bun
import { readFileSync, existsSync } from "fs";
import { join } from "path";

// Path to the generated openapi.json file
const OPENAPI_PATH = join(import.meta.dir, "../api/openapi.json");

// Define MCP Tools
const TOOLS = [
  {
    name: "list_endpoints",
    description: "Lists all available API endpoints grouped by tags (e.g. Auth, Users, Roles) with HTTP methods and summaries.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "search_endpoints",
    description: "Searches for API endpoints matching a keyword in paths, summaries, or descriptions.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Keyword to search for (e.g., 'auth', 'roles', 'users')"
        }
      },
      required: ["query"]
    }
  },
  {
    name: "get_endpoint_details",
    description: "Retrieves complete, detailed documentation for a specific API endpoint including path parameters, query parameters, request schemas, and responses with dereferenced models.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "The endpoint path exactly as listed (e.g. '/api/v1/admin/roles')"
        },
        method: {
          type: "string",
          description: "HTTP method in lowercase (e.g. 'get', 'post', 'put', 'delete')"
        }
      },
      required: ["path", "method"]
    }
  },
  {
    name: "generate_typescript_types",
    description: "Generates type-safe TypeScript interfaces and helper fetch functions for a specific API endpoint based on its OpenAPI spec.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "The endpoint path exactly as listed (e.g. '/api/v1/admin/roles')"
        },
        method: {
          type: "string",
          description: "HTTP method in lowercase (e.g. 'get', 'post')"
        }
      },
      required: ["path", "method"]
    }
  }
];

// Load and parse OpenAPI JSON
function loadOpenApi() {
  if (!existsSync(OPENAPI_PATH)) {
    throw new Error(`OpenAPI spec not found at: ${OPENAPI_PATH}. Please run 'cargo test --lib presentation::openapi::tests::generate_openapi_json' in the api directory first.`);
  }
  try {
    const raw = readFileSync(OPENAPI_PATH, "utf8");
    return JSON.parse(raw);
  } catch (err: any) {
    throw new Error(`Failed to parse OpenAPI JSON: ${err.message}`);
  }
}

// Helper to resolve reference links
function resolveRef(ref: string, openapi: any): { name: string; schema: any } {
  if (!ref || !ref.startsWith("#/components/schemas/")) {
    return { name: "Unknown", schema: { type: "any" } };
  }
  const name = ref.replace("#/components/schemas/", "");
  const schema = openapi.components?.schemas?.[name];
  if (!schema) {
    return { name, schema: { type: "any" } };
  }
  return { name, schema };
}

// Convert schema definitions to human-readable Markdown format
function formatSchema(schema: any, openapi: any, depth = 0): string {
  if (!schema) return "any";
  if (schema.$ref) {
    const { name, schema: resolved } = resolveRef(schema.$ref, openapi);
    if (depth > 4) return `**${name}** (nested)`;
    return `**${name}**:\n${formatSchema(resolved, openapi, depth + 1)}`;
  }

  const indent = "  ".repeat(depth);

  if (schema.type === "array") {
    const itemSchema = schema.items;
    if (itemSchema?.$ref) {
      const { name } = resolveRef(itemSchema.$ref, openapi);
      return `${indent}Array of **${name}**`;
    }
    return `${indent}Array of ${schema.items?.type || "any"}`;
  }

  if (schema.properties) {
    let result = "";
    for (const [key, value] of Object.entries<any>(schema.properties)) {
      const isRequired = schema.required?.includes(key) ? "*(required)*" : "*(optional)*";
      let typeStr = value.type || "object";
      
      if (Array.isArray(typeStr)) {
        typeStr = typeStr.join(" | ");
      }

      if (value.$ref) {
        const { name } = resolveRef(value.$ref, openapi);
        typeStr = `**${name}**`;
      } else if (value.type === "array") {
        if (value.items?.$ref) {
          const { name } = resolveRef(value.items.$ref, openapi);
          typeStr = `Array<**${name}**>`;
        } else {
          typeStr = `Array<${value.items?.type || "any"}>`;
        }
      }

      const desc = value.description ? ` - ${value.description}` : "";
      result += `${indent}- **\`${key}\`**: \`${typeStr}\` ${isRequired}${desc}\n`;
      
      // If nested object with direct properties
      if (value.properties && depth < 3) {
        result += formatSchema(value, openapi, depth + 1);
      }
    }
    return result;
  }

  return `${indent}\`${schema.type || "any"}\`${schema.format ? ` (format: ${schema.format})` : ""}`;
}

// Recursively collect all schemas referenced by a parent schema
function collectSchemas(schema: any, openapi: any, collected: Map<string, any> = new Map()) {
  if (!schema) return collected;
  if (schema.$ref) {
    const { name, schema: resolved } = resolveRef(schema.$ref, openapi);
    if (!collected.has(name)) {
      collected.set(name, resolved);
      collectSchemas(resolved, openapi, collected);
    }
  }
  if (schema.properties) {
    for (const value of Object.values<any>(schema.properties)) {
      collectSchemas(value, openapi, collected);
    }
  }
  if (schema.type === "array" && schema.items) {
    collectSchemas(schema.items, openapi, collected);
  }
  return collected;
}

// Convert schema to exact TypeScript Interface block
function toTypeScriptType(schema: any, openapi: any): string {
  if (!schema) return "any";
  if (schema.$ref) {
    const { name } = resolveRef(schema.$ref, openapi);
    return name;
  }

  let typeStr = schema.type || "any";
  if (Array.isArray(typeStr)) {
    typeStr = typeStr.map(t => t === "null" ? "null" : t).join(" | ");
  }

  if (typeStr === "integer" || typeStr === "number") {
    return "number";
  }
  if (typeStr === "string") {
    if (schema.format === "date-time") return "string"; // Date string
    return "string";
  }
  if (typeStr === "boolean") {
    return "boolean";
  }

  if (schema.type === "array") {
    const innerType = toTypeScriptType(schema.items, openapi);
    return `${innerType}[]`;
  }

  if (schema.properties) {
    let result = "{\n";
    for (const [key, value] of Object.entries<any>(schema.properties)) {
      const isRequired = schema.required?.includes(key) ? "" : "?";
      let valType = toTypeScriptType(value, openapi);
      
      // Handle potential nullable schemas
      if (value.nullable) {
        valType += " | null";
      }
      
      const descComment = value.description ? `  /** ${value.description} */\n` : "";
      result += `${descComment}  ${key}${isRequired}: ${valType};\n`;
    }
    result += "}";
    return result;
  }

  return typeStr;
}

// JSON-RPC Request Router
function handleRequest(req: any) {
  const { method, params, id } = req;

  if (method === "initialize") {
    return sendResponse(id, {
      protocolVersion: "2024-11-05",
      capabilities: {
        tools: {}
      },
      serverInfo: {
        name: "caxur-api-docs-mcp",
        version: "1.0.0"
      }
    });
  }

  if (method === "tools/list") {
    return sendResponse(id, { tools: TOOLS });
  }

  if (method === "tools/call") {
    const { name, arguments: args } = params;
    try {
      const openapi = loadOpenApi();
      
      if (name === "list_endpoints") {
        const paths = openapi.paths || {};
        let md = "# Caxur API - Available Endpoints\n\n";
        
        // Group by tag
        const groups: Record<string, string[]> = {};
        
        for (const [path, pathItem] of Object.entries<any>(paths)) {
          for (const [verb, operation] of Object.entries<any>(pathItem)) {
            const tag = operation.tags?.[0] || "General";
            if (!groups[tag]) groups[tag] = [];
            groups[tag].push(`- **\`${verb.toUpperCase()}\`** \`${path}\` - *${operation.summary || "No summary"}*`);
          }
        }

        for (const [tag, items] of Object.entries(groups)) {
          md += `## ${tag}\n${items.join("\n")}\n\n`;
        }

        return sendResponse(id, {
          content: [{ type: "text", text: md }]
        });
      }

      if (name === "search_endpoints") {
        const query = (args.query || "").toLowerCase();
        const paths = openapi.paths || {};
        let md = `# Search Results for "${query}"\n\n`;
        let found = false;

        for (const [path, pathItem] of Object.entries<any>(paths)) {
          for (const [verb, operation] of Object.entries<any>(pathItem)) {
            const summary = operation.summary || "";
            const desc = operation.description || "";
            const tags = operation.tags || [];
            
            const match = 
              path.toLowerCase().includes(query) ||
              summary.toLowerCase().includes(query) ||
              desc.toLowerCase().includes(query) ||
              tags.some(t => t.toLowerCase().includes(query));

            if (match) {
              found = true;
              md += `### \`${verb.toUpperCase()}\` \`${path}\`\n`;
              md += `- **Tag**: ${tags.join(", ") || "None"}\n`;
              md += `- **Summary**: ${summary}\n`;
              if (desc) md += `- **Description**: ${desc}\n`;
              md += `\n`;
            }
          }
        }

        if (!found) {
          md += `No endpoints found matching query "${query}".`;
        }

        return sendResponse(id, {
          content: [{ type: "text", text: md }]
        });
      }

      if (name === "get_endpoint_details") {
        const targetPath = args.path;
        const targetMethod = args.method.toLowerCase();
        
        const pathItem = openapi.paths?.[targetPath];
        if (!pathItem) {
          return sendError(id, -32602, `Path '${targetPath}' not found in API spec.`);
        }

        const operation = pathItem[targetMethod];
        if (!operation) {
          return sendError(id, -32602, `Method '${targetMethod.toUpperCase()}' not supported on route '${targetPath}'.`);
        }

        let md = "# `" + targetMethod.toUpperCase() + "` `" + targetPath + "`\n\n";
        md += `**Summary**: ${operation.summary || "No summary provided"}\n\n`;
        if (operation.description) {
          md += `**Description**:\n${operation.description}\n\n`;
        }

        // Authentication Info
        if (operation.security) {
          md += `🔒 **Security Schemes Required**: ${operation.security.map((s: any) => Object.keys(s).join(", ")).join(" & ")}\n\n`;
        } else {
          md += `🔓 **Security**: Public Endpoint\n\n`;
        }

        // Path / Query Parameters
        const params = operation.parameters || [];
        if (params.length > 0) {
          md += `## Request Parameters\n\n`;
          md += `| Name | In | Type | Required | Description |\n`;
          md += `|---|---|---|---|---|\n`;
          for (const param of params) {
            let pType = param.schema?.type || "string";
            if (param.schema?.$ref) {
              const { name } = resolveRef(param.schema.$ref, openapi);
              pType = `**${name}**`;
            }
            const isReq = param.required ? "✅ Yes" : "❌ No";
            md += `| \`${param.name}\` | \`${param.in}\` | \`${pType}\` | ${isReq} | ${param.description || "-"} |\n`;
          }
          md += `\n`;
        }

        // Request Body
        const reqBody = operation.requestBody;
        if (reqBody) {
          md += `## Request Body\n\n`;
          const content = reqBody.content?.["application/json"];
          if (content?.schema) {
            md += formatSchema(content.schema, openapi);
          } else {
            md += `*Accepts request body, but JSON schema was not resolved.*\n`;
          }
          md += `\n`;
        }

        // Responses
        const responses = operation.responses || {};
        md += `## Responses\n\n`;
        for (const [code, resp] of Object.entries<any>(responses)) {
          md += `### HTTP ${code} - ${resp.description || "No description"}\n`;
          const respContent = resp.content?.["application/json"];
          if (respContent?.schema) {
            md += formatSchema(respContent.schema, openapi);
          } else if (resp.content) {
            md += `*Content matches type: ${Object.keys(resp.content).join(", ")}*\n`;
          } else {
            md += `*No payload returned.*\n`;
          }
          md += `\n`;
        }

        return sendResponse(id, {
          content: [{ type: "text", text: md }]
        });
      }

      if (name === "generate_typescript_types") {
        const targetPath = args.path;
        const targetMethod = args.method.toLowerCase();
        
        const pathItem = openapi.paths?.[targetPath];
        if (!pathItem) {
          return sendError(id, -32602, `Path '${targetPath}' not found in API spec.`);
        }

        const operation = pathItem[targetMethod];
        if (!operation) {
          return sendError(id, -32602, `Method '${targetMethod.toUpperCase()}' not supported on route '${targetPath}'.`);
        }

        // Collect all schemas to output TypeScript models for them
        const referencedSchemas = new Map<string, any>();
        
        let requestInterface = "any";
        const reqBody = operation.requestBody;
        if (reqBody?.content?.["application/json"]?.schema) {
          const schema = reqBody.content["application/json"].schema;
          requestInterface = toTypeScriptType(schema, openapi);
          collectSchemas(schema, openapi, referencedSchemas);
        }

        let responseInterface = "void";
        const successResp = operation.responses?.["200"] || operation.responses?.["201"];
        if (successResp?.content?.["application/json"]?.schema) {
          const schema = successResp.content["application/json"].schema;
          responseInterface = toTypeScriptType(schema, openapi);
          collectSchemas(schema, openapi, referencedSchemas);
        }

        // Generate the TypeScript file contents
        let tsCode = `/**\n * Auto-generated TypeScript types for ${targetMethod.toUpperCase()} ${targetPath}\n`;
        tsCode += ` * Summary: ${operation.summary || ""}\n */\n\n`;

        // 1. Output referenced schemas as interfaces
        if (referencedSchemas.size > 0) {
          tsCode += `// ==========================================\n`;
          tsCode += `// DATA MODELS / DTOs\n`;
          tsCode += `// ==========================================\n\n`;
          for (const [name, schema] of referencedSchemas.entries()) {
            // Check if it has direct properties and is object
            if (schema.type === "object" || schema.properties) {
              tsCode += `export interface ${name} {\n`;
              for (const [key, value] of Object.entries<any>(schema.properties || {})) {
                const isRequired = schema.required?.includes(key) ? "" : "?";
                let propType = toTypeScriptType(value, openapi);
                if (value.nullable) propType += " | null";
                
                if (value.description) {
                  tsCode += `  /** ${value.description} */\n`;
                }
                tsCode += `  ${key}${isRequired}: ${propType};\n`;
              }
              tsCode += `}\n\n`;
            } else {
              tsCode += `export type ${name} = ${toTypeScriptType(schema, openapi)};\n\n`;
            }
          }
        }

        // 2. Output the custom hook / function structure
        tsCode += `// ==========================================\n`;
        tsCode += `// CLIENT INTEGRATION FUNCTION\n`;
        tsCode += `// ==========================================\n\n`;

        const functionName = operation.operationId || 
          targetPath.split("/").filter(Boolean).pop() + "_" + targetMethod;
          
        const hasPathParams = targetPath.includes("{");
        const cleanPathUrl = targetPath.replace(/\{([^}]+)\}/g, "${$1}");

        let paramsSignature = "";
        const pathParams = (operation.parameters || []).filter((p: any) => p.in === "path");
        const queryParams = (operation.parameters || []).filter((p: any) => p.in === "query");

        const argsList: string[] = [];
        if (pathParams.length > 0) {
          for (const p of pathParams) {
            argsList.push(`${p.name}: string | number`);
          }
        }
        if (reqBody) {
          argsList.push(`payload: ${requestInterface}`);
        }
        if (queryParams.length > 0) {
          argsList.push(`params?: { ${queryParams.map((p: any) => `${p.name}?: string | number`).join("; ")} }`);
        }
        argsList.push(`options?: RequestInit`);

        tsCode += `export async function ${functionName}(${argsList.join(", ")}): Promise<${responseInterface}> {\n`;
        
        let urlDef = `  let url = \`${cleanPathUrl}\`;\n`;
        if (queryParams.length > 0) {
          urlDef += `  if (params) {\n`;
          urlDef += `    const search = new URLSearchParams(params as any).toString();\n`;
          urlDef += `    url += \`?\${search}\`;\n`;
          urlDef += `  }\n`;
        }
        tsCode += urlDef;
        
        tsCode += `  const response = await fetch(url, {\n`;
        tsCode += `    method: "${targetMethod.toUpperCase()}",\n`;
        tsCode += `    headers: {\n`;
        tsCode += `      "Content-Type": "application/json",\n`;
        tsCode += `      ...(options?.headers || {}),\n`;
        tsCode += `    },\n`;
        if (reqBody) {
          tsCode += `    body: JSON.stringify(payload),\n`;
        }
        tsCode += `    ...options,\n`;
        tsCode += `  });\n\n`;
        
        tsCode += `  if (!response.ok) {\n`;
        tsCode += `    const errData = await response.json().catch(() => ({}));\n`;
        tsCode += `    throw new Error(errData.message || \`Request failed with status \${response.status}\`);\n`;
        tsCode += `  }\n\n`;
        
        if (responseInterface !== "void") {
          tsCode += `  return response.json() as Promise<${responseInterface}>;\n`;
        }
        tsCode += `}\n`;

        return sendResponse(id, {
          content: [
            { type: "text", text: `TypeScript types and fetch utility generated successfully:` },
            { type: "text", text: `\`\`\`typescript\n${tsCode}\n\`\`\`` }
          ]
        });
      }

      return sendError(id, -32601, `Tool '${name}' not implemented.`);
    } catch (err: any) {
      return sendError(id, -32603, err.message);
    }
  }

  // Method not found handler (JSON-RPC specification)
  if (id !== undefined) {
    sendError(id, -32601, `Method '${method}' not found.`);
  }
}

function sendResponse(id: number | null, result: any) {
  if (id !== null && id !== undefined) {
    console.log(JSON.stringify({ jsonrpc: "2.0", id, result }));
  }
}

function sendError(id: number | null, code: number, message: string) {
  console.log(JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } }));
}

// Input Buffer handling line-by-line for JSON-RPC stdio protocol
let buffer = "";
process.stdin.setEncoding("utf8");

process.stdin.on("data", (chunk) => {
  buffer += chunk;
  let lineEnd = buffer.indexOf("\n");
  while (lineEnd !== -1) {
    const line = buffer.slice(0, lineEnd).trim();
    buffer = buffer.slice(lineEnd + 1);
    
    if (line) {
      try {
        const req = JSON.parse(line);
        handleRequest(req);
      } catch (err: any) {
        sendError(null, -32700, `Parse error: ${err.message}`);
      }
    }
    
    lineEnd = buffer.indexOf("\n");
  }
});
