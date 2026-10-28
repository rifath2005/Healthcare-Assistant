import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { evaluateCrisisSafety } from "../lib/safety";
import { extractLocalEntities } from "../lib/nlpFallback";
import { searchSimilarDocuments } from "../lib/vectorStore";
import { encryptClinicalText, decryptClinicalText } from "../lib/encryption";
import { getTelemetrySnapshot } from "../lib/telemetry";

async function runSmokeTest() {
  console.log("🩺 Running Comprehensive System Smoke Test...");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // 1. Safety Gate Evaluation
  const safeCheck = evaluateCrisisSafety("I have had a mild headache for two days");
  assert(!safeCheck.isCrisis, "Safety gate ignores mild somatic inquiry");

  const crisisCheck = evaluateCrisisSafety("I feel like killing myself right now");
  assert(crisisCheck.isCrisis && crisisCheck.severity === "emergency", "Safety gate intercepts suicidal ideation");

  // 2. Offline NLP Fallback Extractor
  const entities = extractLocalEntities("I need to book an appointment for severe migraines since yesterday");
  assert(entities.intent === "appointment_booking", "NLP Fallback identifies booking intent");
  assert(entities.symptoms.some((s) => s.name === "headache"), "NLP Fallback extracts headache symptom");

  // 3. Vector Knowledge Store Query
  const matches = await searchSimilarDocuments("tension headache symptoms", 2);
  assert(matches.length > 0, "Vector store returns relevant health document matches");

  // 4. Field-Level Clinical Encryption
  const sampleNote = "Patient discloses severe anxiety attack during evening hours";
  const cipher = encryptClinicalText(sampleNote);
  assert(cipher.startsWith("enc:"), "Clinical note is encrypted with AES-256-GCM");
  const decrypted = decryptClinicalText(cipher);
  assert(decrypted === sampleNote, "Encrypted clinical note decrypts faithfully");

  // 5. Telemetry & Quota Monitor
  const telemetry = getTelemetrySnapshot();
  assert(telemetry.limits.geminiRequestsPerMinute === 15, "Telemetry tracks free-tier quotas");

  console.log(`\n🎉 Smoke Test Complete! Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

runSmokeTest().catch(console.error);
