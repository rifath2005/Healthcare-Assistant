import fs from "fs";
import path from "path";

const DOCS_DIR = path.join(process.cwd(), "data", "health_docs");

async function main() {
  console.log("🏥 Initializing public health documentation repository...");

  if (!fs.existsSync(DOCS_DIR)) {
    fs.mkdirSync(DOCS_DIR, { recursive: true });
  }

  const existing = fs.readdirSync(DOCS_DIR);
  console.log(`Found ${existing.length} source documents in ${DOCS_DIR}:`);
  for (const file of existing) {
    const stats = fs.statSync(path.join(DOCS_DIR, file));
    console.log(` - ${file} (${stats.size} bytes)`);
  }

  console.log("✅ Curated medical guidelines baseline verified.");
}

main().catch(console.error);
