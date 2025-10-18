import express, { Request, Response } from "express";
import fs from "fs";
import path from "path";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_PATH = path.resolve("data/combined.json");

// Middlewares
app.use(cors());
app.use(express.json());

// Lazy load combined dataset
let dataset: Record<string, any> = {};

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
 * Root info
 */
app.get("/", (_, res: Response) => {
  const data = getDataset();
  const componentCount = Object.keys(data).filter(key => key !== "_tokens").length;
  const tokenCount = data["_tokens"] ? Object.keys(data["_tokens"]).length : 0;
  
  res.json({
    name: "PrimeVue MCP API",
    version: "1.0.0",
    description: "Model Context Protocol server for PrimeVue components and design tokens",
    endpoints: [
      "/mcp/components",
      "/mcp/component/:name", 
      "/mcp/tokens",
      "/mcp/search"
    ],
    stats: {
      components: componentCount,
      tokens: tokenCount,
      total: componentCount + tokenCount
    }
  });
});

/**
 * List all components or filter by query
 */
app.get("/mcp/components", (req: Request, res: Response) => {
  try {
    const data = getDataset();
    const { q } = req.query;
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

    res.json(keys.map((key) => ({
      name: key,
      title: data[key]?.title,
      description: data[key]?.description,
      hasProps: !!data[key]?.props,
      hasExamples: !!data[key]?.examples?.length
    })));
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Get one component by name (optionally a specific section)
 */
app.get("/mcp/component/:name", (req: Request, res: Response) => {
  try {
    const data = getDataset();
    const { name } = req.params;
    const { section } = req.query;

    const comp = data[name.toLowerCase()] || data[name];
    if (!comp) {
      return res.status(404).json({ 
        error: `Component '${name}' not found`,
        available: Object.keys(data).filter(key => key !== "_tokens").slice(0, 10)
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
app.get("/mcp/tokens", (req: Request, res: Response) => {
  try {
    const data = getDataset();
    const { q } = req.query;
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

    res.json({
      count: Object.keys(tokens).length,
      tokens
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Global search across components and tokens
 */
app.get("/mcp/search", (req: Request, res: Response) => {
  try {
    const data = getDataset();
    const { q } = req.query;
    
    if (!q || typeof q !== "string") {
      return res.status(400).json({ error: "Query parameter 'q' is required" });
    }

    const term = q.toLowerCase();
    const results: any[] = [];

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

    res.json({
      query: q,
      count: results.length,
      results
    });
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
