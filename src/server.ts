import express, { Request, Response } from "express";
import fs from "fs";
import path from "path";
import cors from "cors";
import { 
  ComponentQuerySchema, 
  ComponentParamsSchema, 
  ComponentSectionQuerySchema,
  TokensQuerySchema,
  SearchQuerySchema,
  validateQuery,
  validateParams,
  SearchResult
} from "./validation.js";
import { 
  ComponentListRequest, 
  ComponentDetailRequest, 
  TokensRequest, 
  SearchRequest 
} from "./types.js";

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_PATH = path.resolve("data/combined.json");

// Middlewares
app.use(cors());
app.use(express.json());

// Lazy load combined dataset
let dataset: Record<string, any> = {};

// Cache system for frequently accessed data
const cache = {
  components: new Map<string, any[]>(),
  tokens: new Map<string, any>(),
  search: new Map<string, any>(),
  // Cache TTL in milliseconds (5 minutes)
  ttl: 5 * 60 * 1000,
  timestamps: new Map<string, number>()
};

// Helper function to check if cache entry is valid
function isCacheValid(key: string): boolean {
  const timestamp = cache.timestamps.get(key);
  if (!timestamp) return false;
  return Date.now() - timestamp < cache.ttl;
}

// Helper function to set cache with timestamp
function setCache(cacheMap: Map<string, any>, key: string, value: any): void {
  cacheMap.set(key, value);
  cache.timestamps.set(key, Date.now());
}

// Helper function to get cache or compute
function getCachedOrCompute<T>(
  cacheMap: Map<string, T>, 
  key: string, 
  computeFn: () => T
): T {
  if (cacheMap.has(key) && isCacheValid(key)) {
    return cacheMap.get(key)!;
  }
  
  const result = computeFn();
  setCache(cacheMap, key, result);
  return result;
}

function getDataset() {
  if (Object.keys(dataset).length === 0) {
    try {
      const file = fs.readFileSync(DATA_PATH, "utf8");
      dataset = JSON.parse(file);
      console.log(`✅ Loaded ${Object.keys(dataset).length} components from combined.json`);
    } catch (err) {
      console.error("❌ Failed to load combined.json:", err);
      throw err;
    }
  }
  return dataset;
}

/**
 * Health check endpoint for Fly.io
 */
app.get("/health", (_: Request, res: Response) => {
  console.log("Health check endpoint called");
  res.status(200).json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get("/test", (_: Request, res: Response) => {
  res.json({ message: "Test endpoint works" });
});

/**
 * Cache management endpoints
 */
app.get("/cache/stats", (_: Request, res: Response) => {
  const stats = {
    components: {
      size: cache.components.size,
      keys: Array.from(cache.components.keys())
    },
    tokens: {
      size: cache.tokens.size,
      keys: Array.from(cache.tokens.keys())
    },
    search: {
      size: cache.search.size,
      keys: Array.from(cache.search.keys())
    },
    ttl: cache.ttl,
    totalEntries: cache.components.size + cache.tokens.size + cache.search.size
  };
  
  res.json(stats);
});

app.post("/cache/clear", (_: Request, res: Response) => {
  cache.components.clear();
  cache.tokens.clear();
  cache.search.clear();
  cache.timestamps.clear();
  
  res.json({ 
    message: "Cache cleared successfully",
    timestamp: new Date().toISOString()
  });
});

/**
 * Root info
 */
app.get("/", (_: Request, res: Response) => {
  res.json({
    name: "PrimeVue MCP API",
    version: "1.0.0",
    description: "Model Context Protocol server for PrimeVue components and design tokens",
    endpoints: [
      "/mcp/components",
      "/mcp/component/:name", 
      "/mcp/tokens",
      "/mcp/search",
      "/cache/stats",
      "/cache/clear"
    ]
  });
});

/**
 * List all components or filter by query
 */
app.get("/mcp/components", validateQuery(ComponentQuerySchema), (req: ComponentListRequest, res: Response) => {
  try {
    const data = getDataset();
    const { q } = req.validatedQuery;
    
    // Create cache key based on query
    const cacheKey = q ? `components:${q}` : "components:all";
    
    const result = getCachedOrCompute(cache.components, cacheKey, () => {
      let keys = Object.keys(data).filter((key) => key !== "_tokens");

      if (q && typeof q === "string") {
        const term = q.toLowerCase();
        keys = keys.filter((key) => {
          const component = data[key];
          return (
            key.toLowerCase().includes(term) ||
            component?.title?.toLowerCase().includes(term) ||
            component?.description?.toLowerCase().includes(term)
          );
        });
      }

      return keys.map((key) => {
        const component = data[key];
        const standardSections = ["title", "description", "props", "examples"];
        const sections = Object.keys(component || {}).filter(k => 
          !standardSections.includes(k) && 
          typeof component[k] === 'object' && 
          component[k] !== null
        );
        
        return {
          name: key,
          title: component?.title,
          description: component?.description,
          hasProps: !!component?.props,
          hasExamples: !!component?.examples?.length,
          sections
        };
      });
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Get one component by name (optionally a specific section)
 */
app.get("/mcp/component/:name", 
  validateParams(ComponentParamsSchema), 
  validateQuery(ComponentSectionQuerySchema), 
  (req: ComponentDetailRequest, res: Response) => {
  try {
    const data = getDataset();
    const { name } = req.validatedParams;
    const { section } = req.validatedQuery;

    const comp = data[name.toLowerCase()] || data[name];
    if (!comp) {
      return res.status(404).json({ 
        error: `Component '${name}' not found`,
        available: Object.keys(data).filter(key => key !== "_tokens")
      });
    }

    if (section && typeof section === "string") {
      const sectionKey = section.toLowerCase();
      if (comp[sectionKey]) {
        return res.json(comp[sectionKey]);
      } else {
        const availableSections = Object.keys(comp).filter(key => 
          typeof comp[key] === 'object' && comp[key] !== null
        );
        return res.status(404).json({ 
          error: `Section '${section}' not found in '${name}'`,
          available: availableSections
        });
      }
    }

    res.json(comp);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Get global design tokens
 */
app.get("/mcp/tokens", validateQuery(TokensQuerySchema), (req: TokensRequest, res: Response) => {
  try {
    const data = getDataset();
    const { q } = req.validatedQuery;
    
    // Create cache key based on query
    const cacheKey = q ? `tokens:${q}` : "tokens:all";
    
    const result = getCachedOrCompute(cache.tokens, cacheKey, () => {
      let tokens = data["_tokens"] || {};

      if (q && typeof q === "string") {
        const term = q.toLowerCase();
        const filteredTokens: Record<string, string> = {};
        
        Object.entries(tokens).forEach(([key, value]) => {
          if (key.toLowerCase().includes(term) || 
              (typeof value === 'string' && value.toLowerCase().includes(term))) {
            filteredTokens[key] = value as string;
          }
        });
        
        tokens = filteredTokens;
      }

      return {
        count: Object.keys(tokens).length,
        tokens
      };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Global search across components and tokens
 */
app.get("/mcp/search", validateQuery(SearchQuerySchema), (req: SearchRequest, res: Response) => {
  try {
    const data = getDataset();
    const { q } = req.validatedQuery;
    
    // Create cache key based on search query
    const cacheKey = `search:${q}`;
    
    const result = getCachedOrCompute(cache.search, cacheKey, () => {
      // Zod validation ensures q is present and is a string
      const term = q.toLowerCase();
      const results: SearchResult[] = [];

      // Search components
      Object.entries(data).forEach(([key, value]) => {
        if (key === "_tokens") return;

        const component = value as any;
        const matches: string[] = [];

        if (key.toLowerCase().includes(term)) matches.push("name");
        if (component?.title?.toLowerCase().includes(term)) matches.push("title");
        if (component?.description?.toLowerCase().includes(term)) matches.push("description");
        
        // Search in props
        if (component?.props) {
          Object.keys(component.props).forEach(prop => {
            if (prop.toLowerCase().includes(term)) matches.push(`prop:${prop}`);
          });
        }

        if (matches.length > 0) {
          results.push({
            type: "component",
            name: key,
            title: component?.title,
            description: component?.description,
            matches
          });
        }
      });

      // Search tokens
      if (data["_tokens"]) {
        Object.entries(data["_tokens"]).forEach(([key, value]) => {
          if (key.toLowerCase().includes(term) || 
              (typeof value === 'string' && value.toLowerCase().includes(term))) {
            results.push({
              type: "token",
              name: key,
              value: value as string,
              matches: ["token"]
            });
          }
        });
      }

      return {
        query: q,
        count: results.length,
        results
      };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🌐 PrimeVue MCP running on http://localhost:${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/`);
  console.log(`🔍 Search: http://localhost:${PORT}/mcp/search?q=button`);
  console.log(`⚡ Dataset will be loaded on first request (lazy loading)`);
});
