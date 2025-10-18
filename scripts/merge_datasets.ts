import * as fs from "fs";
import * as path from "path";

const DATASETS = {
  api: path.resolve("data/api.json"),
  docs: path.resolve("data/docs.json"),
  logic: path.resolve("data/logic.json"),
  tokens: path.resolve("data/tokens.json")
};

const OUTPUT_PATH = path.resolve("data/combined.json");

interface ComponentData {
  title?: string;
  description?: string;
  examples?: string[];
  props?: Record<string, string>;
  emits?: Record<string, string>;
  slots?: Record<string, string>;
  logic?: {
    imports?: string[];
    functions?: string[];
    variables?: string[];
  };
  tokens?: Record<string, string>;
}

/**
 * Reads a JSON file safely, returning an empty object if missing or invalid.
 */
function readJsonSafe(filePath: string): Record<string, any> {
  try {
    if (!fs.existsSync(filePath)) return {};
    const data = fs.readFileSync(filePath, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.warn(`⚠️ Failed to read or parse ${path.basename(filePath)}:`, err);
    return {};
  }
}

/**
 * Deep merges component data by component key (button, card, etc.)
 */
function mergeDatasets(): Record<string, ComponentData> {
  const api = readJsonSafe(DATASETS.api);
  const docs = readJsonSafe(DATASETS.docs);
  const logic = readJsonSafe(DATASETS.logic);
  const tokens = readJsonSafe(DATASETS.tokens);

  const merged: Record<string, ComponentData> = {};

  const allKeys = new Set([
    ...Object.keys(api),
    ...Object.keys(docs),
    ...Object.keys(logic)
  ]);

  for (const key of allKeys) {
    merged[key] = {
      ...(docs[key] || {}),
      ...(api[key] || {}),
      ...(logic[key] ? { logic: logic[key] } : {})
    };
  }

  // Tokens se añaden de forma global (no por componente)
  if (Object.keys(tokens).length > 0) {
    merged["_tokens"] = tokens;
  }

  return merged;
}

/**
 * Main execution
 */
function main() {
  console.log("🔗 Merging extracted datasets...");

  const mergedData = mergeDatasets();

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(mergedData, null, 2));
  console.log(`✅ Combined dataset written to: ${OUTPUT_PATH}`);
  console.log(`📦 Total components merged: ${Object.keys(mergedData).length - 1}`);
}

main();
