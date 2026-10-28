import fs from "fs";
import path from "path";
import * as dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config({ path: ".env.local" });
dotenv.config();

const DOCS_DIR = path.join(process.cwd(), "data", "health_docs");
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const geminiApiKey = process.env.GEMINI_API_KEY;

function chunkText(text: string, chunkSize: number = 800, overlap: number = 100): string[] {
  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    const endIndex = Math.min(startIndex + chunkSize, text.length);
    let chunk = text.slice(startIndex, endIndex);

    // If not at the end of text, attempt to break at a paragraph or sentence boundary
    if (endIndex < text.length) {
      const lastNewline = chunk.lastIndexOf("\n\n");
      if (lastNewline > chunkSize * 0.5) {
        chunk = chunk.slice(0, lastNewline);
      }
    }

    chunks.push(chunk.trim());
    startIndex += chunk.length - overlap;
    if (startIndex <= 0) break;
  }

  return chunks.filter((c) => c.length > 50);
}

async function main() {
  console.log("🚀 Starting Medical Document Ingestion Pipeline...");

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("❌ Supabase environment variables missing. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  if (!geminiApiKey) {
    console.error("❌ Gemini API Key missing. Set GEMINI_API_KEY.");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const genAI = new GoogleGenerativeAI(geminiApiKey);
  const embedModel = genAI.getGenerativeModel({ model: "text-embedding-004" });

  const files = fs.readdirSync(DOCS_DIR).filter((f) => f.endsWith(".md"));
  console.log(`📂 Found ${files.length} markdown documents to process in ${DOCS_DIR}`);

  let totalChunks = 0;

  for (const file of files) {
    const filePath = path.join(DOCS_DIR, file);
    const rawContent = fs.readFileSync(filePath, "utf-8");

    // Extract title
    const firstLine = rawContent.split("\n")[0];
    const title = firstLine.replace(/^#\s*/, "") || file;

    // Extract source URL
    const urlMatch = rawContent.match(/\*\*URL:\*\*\s*(https?:\/\/[^\s]+)/);
    const sourceUrl = urlMatch ? urlMatch[1] : "";

    const chunks = chunkText(rawContent);
    console.log(`📄 Processing '${file}' -> ${chunks.length} chunks...`);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      try {
        const embedResult = await embedModel.embedContent(chunk);
        const embedding = embedResult.embedding.values;

        const { error } = await supabase.from("health_documents").insert({
          title: `${title} (Section ${i + 1})`,
          content: chunk,
          source_url: sourceUrl,
          embedding,
          metadata: { filename: file, chunkIndex: i, totalChunks: chunks.length },
        });

        if (error) {
          console.error(`❌ DB insert failed for chunk ${i}:`, error.message);
        } else {
          totalChunks++;
        }
      } catch (embedError) {
        console.error(`❌ Embedding failed for chunk ${i}:`, embedError);
      }
    }
  }

  console.log(`✅ Ingestion Complete! Successfully stored ${totalChunks} vector document chunks.`);
}

main().catch(console.error);
