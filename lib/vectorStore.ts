import { createClient } from "@supabase/supabase-js";
import { generateEmbedding } from "@/lib/gemini";
import { env } from "@/lib/env";
import { recordVectorQuery } from "@/lib/telemetry";

export interface HealthDocumentMatch {
  id: string;
  title: string;
  content: string;
  source_url?: string;
  metadata?: Record<string, unknown>;
  similarity: number;
}

// Fallback curated local knowledge base if Supabase connection or pgvector is not configured
const LOCAL_KNOWLEDGE_BASE: HealthDocumentMatch[] = [
  {
    id: "kb-01",
    title: "CDC: Tension Headaches vs Migraines",
    content:
      "Tension headaches produce dull, aching head pain and tightness across the forehead or back of neck. Rest, hydration, and over-the-counter pain relievers often help. Migraines typically present with throbbing, unilateral pain, nausea, and sensitivity to light and sound. Seek immediate emergency evaluation if headache is accompanied by sudden numbness, confusion, or visual loss.",
    source_url: "https://www.cdc.gov/headaches",
    similarity: 0.88,
  },
  {
    id: "kb-02",
    title: "MedlinePlus: Managing Acute Stress & Panic",
    content:
      "Acute anxiety attacks trigger rapid heart rate, hyperventilation, and dizziness. Slow, diaphragmatic breathing (such as 4-7-8 box breathing) activates the parasympathetic nervous system, lowering cortisol and stabilizing blood pressure. The 5-4-3-2-1 sensory grounding technique redirects acute neurological focus.",
    source_url: "https://medlineplus.gov/stress",
    similarity: 0.84,
  },
  {
    id: "kb-03",
    title: "WHO Guidelines: Upper Respiratory Infections",
    content:
      "Viral upper respiratory infections typically involve mild fever, nasal congestion, sneezing, and sore throat lasting 7 to 10 days. Antibiotics are ineffective against viral agents. Rest, warm fluid intake, and saline gargles relieve symptoms. Consult a physician if fever exceeds 102°F (39°C) or persists over 3 days.",
    source_url: "https://www.who.int/respiratory",
    similarity: 0.81,
  },
  {
    id: "kb-04",
    title: "American Heart Association: Warning Signs of Heart Attack",
    content:
      "Major symptoms of a myocardial infarction include crushing chest discomfort, pressure or squeezing in the center of the chest, pain radiating to the jaw, neck, back, or arms, shortness of breath, and cold sweats. Call 911 immediately if these warning signs occur.",
    source_url: "https://www.heart.org/heart-attack-symptoms",
    similarity: 0.92,
  },
];

/**
 * Searches the Supabase pgvector store for similar health documents using match_health_documents RPC.
 */
export async function searchSimilarDocuments(
  query: string,
  limit: number = 3,
  threshold: number = 0.75
): Promise<HealthDocumentMatch[]> {
  if (!query || query.trim().length === 0) return [];

  recordVectorQuery();

  try {
    // Generate 768-dim embedding via Gemini
    const embedding = await generateEmbedding(query);

    // If Supabase credentials are placeholders, use local knowledge base matching
    if (
      !env.NEXT_PUBLIC_SUPABASE_URL ||
      env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")
    ) {
      return searchLocalFallback(query, limit);
    }

    const supabase = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { data, error } = await supabase.rpc("match_health_documents", {
      query_embedding: embedding,
      match_threshold: threshold,
      match_count: limit,
    });

    if (error) {
      console.warn("Supabase match_health_documents error, falling back to local KB:", error.message);
      return searchLocalFallback(query, limit);
    }

    if (!data || data.length === 0) {
      return searchLocalFallback(query, limit);
    }

    return data as HealthDocumentMatch[];
  } catch (err) {
    console.warn("Vector store query failed, falling back to local KB:", err);
    return searchLocalFallback(query, limit);
  }
}

function searchLocalFallback(query: string, limit: number): HealthDocumentMatch[] {
  const q = query.toLowerCase();
  const scored = LOCAL_KNOWLEDGE_BASE.map((doc) => {
    let score = 0.7;
    const words = q.split(/\s+/).filter((w) => w.length > 3);
    for (const w of words) {
      if (doc.title.toLowerCase().includes(w) || doc.content.toLowerCase().includes(w)) {
        score += 0.08;
      }
    }
    return { ...doc, similarity: Math.min(score, 0.95) };
  });

  return scored.sort((a, b) => b.similarity - a.similarity).slice(0, limit);
}
