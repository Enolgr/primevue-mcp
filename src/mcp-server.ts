import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "fs";
import path from "path";

const DATA_PATH = path.resolve("data/combined.json");

// Cache dataset
let dataset: Record<string, any> = {};

function getDataset() {
  if (Object.keys(dataset).length === 0) {
    try {
      const file = fs.readFileSync(DATA_PATH, "utf8");
      dataset = JSON.parse(file);
      console.error(`✅ Loaded ${Object.keys(dataset).length} components`);
    } catch (err) {
      console.error("❌ Failed to load dataset:", err);
      throw err;
    }
  }
  return dataset;
}

// Create MCP server
const server = new Server(
  {
    name: "primevue-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// List available resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const data = getDataset();
  const components = Object.keys(data).filter((key) => key !== "_tokens");

  return {
    resources: [
      ...components.map((name) => ({
        uri: `primevue://component/${name}`,
        name: `PrimeVue ${data[name]?.title || name}`,
        description: data[name]?.description || `PrimeVue ${name} component`,
        mimeType: "application/json",
      })),
      {
        uri: "primevue://tokens",
        name: "PrimeVue Design Tokens",
        description: "Global design tokens for PrimeVue components",
        mimeType: "application/json",
      },
    ],
  };
});

// Read resource by URI
server.setRequestHandler(ReadResourceRequestSchema, async (request: any) => {
  const data = getDataset();
  const { uri } = request.params;

  if (uri === "primevue://tokens") {
    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(data["_tokens"] || {}, null, 2),
        },
      ],
    };
  }

  if (uri.startsWith("primevue://component/")) {
    const name = uri.replace("primevue://component/", "");
    const comp = data[name.toLowerCase()] || data[name];
    if (!comp) throw new Error(`Component '${name}' not found`);
    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(comp, null, 2),
        },
      ],
    };
  }

  throw new Error(`Unknown resource: ${uri}`);
});

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "search_components",
        description: "Search PrimeVue components by name, title, or description",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "Search term" },
          },
        },
      },
      {
        name: "get_component",
        description: "Get detailed information about a specific component",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string", description: "Component name" },
          },
          required: ["name"],
        },
      },
      {
        name: "search_tokens",
        description: "Search PrimeVue design tokens",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "Search term" },
          },
        },
      },
      {
        name: "list_components",
        description: "List all available components",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ],
  };
});

// Types for better type safety
interface ToolRequest {
  params: {
    name: string;
    arguments?: Record<string, any>;
  };
}

interface Component {
  name: string;
  title?: string;
  description?: string;
  hasProps: boolean;
  hasExamples: boolean;
}

// Helper functions for clean code
function createTextResponse(data: any) {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
}

function searchComponents(data: Record<string, any>, query: string): Component[] {
  const components = Object.keys(data).filter((k) => k !== "_tokens");
  const lowerQuery = query.toLowerCase();

  return components
    .filter((key) => {
      const comp = data[key];
      return (
        key.toLowerCase().includes(lowerQuery) ||
        comp?.title?.toLowerCase().includes(lowerQuery) ||
        comp?.description?.toLowerCase().includes(lowerQuery)
      );
    })
    .map((key) => ({
      name: key,
      title: data[key]?.title,
      description: data[key]?.description,
      hasProps: !!data[key]?.props,
      hasExamples: !!data[key]?.examples?.length,
    }));
}

function getComponent(data: Record<string, any>, name: string) {
  const comp = data[name.toLowerCase()] || data[name];
  if (!comp) {
    const available = Object.keys(data)
      .filter((k) => k !== "_tokens")
      .slice(0, 10);
    throw new Error(`Component '${name}' not found. Available: ${available.join(", ")}`);
  }
  return comp;
}

function searchTokens(data: Record<string, any>, query: string) {
  const tokens = data["_tokens"] || {};
  const lowerQuery = query.toLowerCase();
  const filtered: Record<string, string> = {};

  Object.entries(tokens).forEach(([key, value]) => {
    if (
      key.toLowerCase().includes(lowerQuery) ||
      (typeof value === "string" && value.toLowerCase().includes(lowerQuery))
    ) {
      filtered[key] = value as string;
    }
  });

  return { query, count: Object.keys(filtered).length, tokens: filtered };
}

function listComponents(data: Record<string, any>) {
  const components = Object.keys(data).filter((k) => k !== "_tokens");
  const tokenCount = data["_tokens"] ? Object.keys(data["_tokens"]).length : 0;

  return {
    name: "PrimeVue MCP",
    version: "1.0.0",
    stats: {
      components: components.length,
      tokens: tokenCount,
      total: components.length + tokenCount,
    },
    components: components.map(name => ({
      name,
      title: data[name]?.title,
      description: data[name]?.description,
    })),
  };
}

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request: ToolRequest) => {
  const { name, arguments: args } = request.params;
  const data = getDataset();

  switch (name) {
    case "search_components": {
      const query = args?.query || "";
      const results = searchComponents(data, query);
      return createTextResponse({ query, count: results.length, results });
    }

    case "get_component": {
      const compName = args?.name;
      if (!compName) throw new Error("Component name is required");
      const comp = getComponent(data, compName);
      return createTextResponse(comp);
    }

    case "search_tokens": {
      const query = args?.query || "";
      const result = searchTokens(data, query);
      return createTextResponse(result);
    }

    case "list_components": {
      const result = listComponents(data);
      return createTextResponse(result);
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("🚀 PrimeVue MCP server running");
}

main().catch(console.error);
