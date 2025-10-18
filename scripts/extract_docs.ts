import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { load } from "cheerio";

const API_PATH = path.resolve("data/api.json");
const OUTPUT_PATH = path.resolve("data/docs.json");
const BASE_URL = "https://www.primevue.org";

async function fetchDocs(component: string) {
  const url = `${BASE_URL}/${component}/`;
  console.log(`📘 Fetching docs for: ${component}`);

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`⚠️ Skipped ${component} (status ${res.status})`);
      return null;
    }

    const html = await res.text();
    const $ = load(html);

    // Extract title
    const title = $("h1").first().text().trim();

    // Extract short description
    const description = $("p").first().text().trim();

    // Extract example code blocks
    const examples: string[] = [];
    $("pre code").each((_, el) => {
      const code = $(el).text().trim();
      if (code.includes("<")) examples.push(code);
    });

    return { title, description, examples };
  } catch (err) {
    console.error(`❌ Failed to fetch ${component}:`, err);
    return null;
  }
}

async function main() {
  const api = JSON.parse(fs.readFileSync(API_PATH, "utf8"));
  const docs: Record<string, any> = {};

  for (const component of Object.keys(api)) {
    const data = await fetchDocs(component);
    if (data) docs[component] = data;
    // small pause between requests (to avoid blocking)
    await new Promise((r) => setTimeout(r, 300));
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(docs, null, 2));
  console.log(`✅ Docs extracted for ${Object.keys(docs).length} components`);
}

main();
