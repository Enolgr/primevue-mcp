import * as fs from "fs";
import * as path from "path";

const PRIMEVUE_DIR = path.resolve("node_modules/primevue");
const OUTPUT_PATH = path.resolve("data/logic.json");

function readFileSafe(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

/**
 * Extract key logic signals from component files:
 * - composables (useX)
 * - imported Vue features (ref, reactive, watch, computed)
 * - declared methods
 * - template directives (@click, v-model, etc.)
 */
function extractLogicFromFile(content: string): Record<string, any> {
  const logic: Record<string, any> = {};

  // Detect imported composables
  const useMatches = content.match(/use[A-Z]\w+/g);
  if (useMatches) {
    logic.composables = Array.from(new Set(useMatches));
  }

  // Detect imported Vue reactivity APIs
  const vueImports = content.match(/\b(ref|reactive|computed|watch|onMounted|onUnmounted)\b/g);
  if (vueImports) {
    logic.vueImports = Array.from(new Set(vueImports));
  }

  // Detect methods declared as function or shorthand inside setup()
  const methodMatches = content.match(/\b(\w+)\s*\([^)]*\)\s*{[^}]*}/g);
  if (methodMatches) {
    const filtered = methodMatches
      .map(m => m.split("(")[0].trim())
      .filter(m => !["setup", "render"].includes(m));
    logic.methods = Array.from(new Set(filtered));
  }

  // Detect emitted events via emit("...")
  const emitMatches = content.match(/emit\(['"`](.+?)['"`]\)/g);
  if (emitMatches) {
    logic.emits = emitMatches.map(e => e.match(/['"`](.+?)['"`]/)?.[1]);
  }

  return logic;
}

/**
 * Recursively traverse each component directory
 */
function extractLogic() {
  const result: Record<string, any> = {};

  for (const dir of fs.readdirSync(PRIMEVUE_DIR)) {
    const compPath = path.join(PRIMEVUE_DIR, dir);
    if (!fs.statSync(compPath).isDirectory()) continue;

    // Potential sources of logic
    const vueFile = path.join(compPath, `${dir}.vue`);
    const mjsFile = path.join(compPath, "index.mjs");
    const logicFile = readFileSafe(vueFile) || readFileSafe(mjsFile);
    if (!logicFile) continue;

    const extracted = extractLogicFromFile(logicFile);
    if (Object.keys(extracted).length > 0) {
      result[dir] = extracted;
    }
  }

  return result;
}

/**
 * Main
 */
function main() {
  console.log("🧠 Extracting internal logic from PrimeVue components...");
  const logic = extractLogic();
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(logic, null, 2));
  console.log(`✅ Extracted logic for ${Object.keys(logic).length} components`);
}

main();
