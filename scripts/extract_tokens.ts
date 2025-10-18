import * as fs from "fs";
import * as path from "path";

const PRIMEVUE_DIRS = [
  path.resolve("node_modules/@primeuix/styles"),
  path.resolve("node_modules/@primeuix/styled")
];
const OUTPUT_PATH = path.resolve("data/tokens.json");

function readFileSafe(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

// Recursively search for PrimeVue v4 style files
function findTokenFiles(baseDir: string): string[] {
  const files: string[] = [];

  function walk(dir: string) {
    if (!fs.existsSync(dir)) return;
    for (const file of fs.readdirSync(dir)) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (
        /\.(mjs|js)$/i.test(file) &&
        !file.includes(".map")
      ) {
        files.push(fullPath);
      }
    }
  }

  walk(baseDir);
  return files;
}

// Extract tokens dt() from each file
function extractTokensFromFile(content: string): Record<string, string> {
  const tokens: Record<string, string> = {};
  
  // Buscar todas las llamadas a dt() en el contenido
  const dtMatches = content.match(/dt\(['"`]([^'"`]+)['"`]\)/g);
  if (dtMatches) {
    for (const match of dtMatches) {
      // Extraer el path del token
      const tokenMatch = match.match(/dt\(['"`]([^'"`]+)['"`]\)/);
      if (tokenMatch) {
        const tokenPath = tokenMatch[1];
        // Convertir el path a una clave de token más legible
        const tokenKey = `--p-${tokenPath.replace(/\./g, '-')}`;
        tokens[tokenKey] = `dt('${tokenPath}')`;
      }
    }
  }
  
  return tokens;
}

function main() {
  console.log("🎨 Extracting design tokens from PrimeVue themes...");

  const tokens: Record<string, string> = {};

  for (const baseDir of PRIMEVUE_DIRS) {
    const tokenFiles = findTokenFiles(baseDir);

    for (const file of tokenFiles) {
      const content = readFileSafe(file);
      if (!content) continue;
      const extracted = extractTokensFromFile(content);
      Object.assign(tokens, extracted);
    }
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(tokens, null, 2));
  console.log(`✅ Extracted ${Object.keys(tokens).length} design tokens`);
  console.log(`📁 Output written to: ${OUTPUT_PATH}`);
}

main();
