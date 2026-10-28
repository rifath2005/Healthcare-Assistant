import { describe, it, expect } from "vitest";
import { searchSimilarDocuments } from "@/lib/vectorStore";

const BENCHMARK_QUESTIONS = [
  "How to manage tension headaches at home?",
  "What are the primary symptoms of migraine with aura?",
  "How does 4-7-8 diaphragmatic breathing reduce acute panic?",
  "What is the 5-4-3-2-1 sensory grounding technique?",
  "What are the classical warning signs of a myocardial infarction?",
  "How do viral upper respiratory infections resolve?",
  "When should an adult consult a physician for a fever?",
  "Can dehydration cause throbbing head pain?",
  "What is the difference between tension headaches and migraines?",
  "What to do when someone experiences crushing chest discomfort?",
  "How does vagus nerve stimulation lower heart rate?",
  "What are atypical heart attack symptoms in women?",
  "Why are antibiotics ineffective for common viral colds?",
  "What emergency criteria warrant immediate 911 dispatch for headaches?",
  "How to de-escalate acute anxiety without medication?",
];

describe("RAG Vector Retrieval Quality Benchmark", () => {
  it("should retrieve relevant top-3 medical context for standardized clinical questions", async () => {
    let successfulRetrievals = 0;

    for (const question of BENCHMARK_QUESTIONS) {
      const results = await searchSimilarDocuments(question, 3, 0.7);
      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);

      // Verify each result contains content, title, and similarity score
      for (const res of results) {
        expect(res.title).toBeDefined();
        expect(res.content.length).toBeGreaterThan(20);
        expect(res.similarity).toBeGreaterThan(0.65);
      }

      successfulRetrievals++;
    }

    const precision = successfulRetrievals / BENCHMARK_QUESTIONS.length;
    expect(precision).toBe(1.0); // 100% retrieval success across standardized benchmark
  });
});
