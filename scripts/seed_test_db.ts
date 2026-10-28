import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.log("ℹ️ Supabase environment credentials not configured or placeholder. Skipping live teardown.");
  process.exit(0);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function seed() {
  console.log("🌱 Teardown & Seeding Test Database...");

  try {
    // Clean test tables
    await supabase.from("appointments").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("messages").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("conversations").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("mood_logs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("crisis_logs").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    console.log("🧹 Previous records cleaned.");

    // Seed test doctor
    const testDoctorId = "44444444-4444-4444-4444-444444444444";
    await supabase.from("doctors").upsert({
      id: testDoctorId,
      name: "Dr. Test Provider, MD",
      specialty: "General Internal Medicine",
      calendar_id: "primary",
      is_active: true,
      working_hours: {
        monday: { start: "09:00", end: "17:00" },
        tuesday: { start: "09:00", end: "17:00" },
        wednesday: { start: "09:00", end: "17:00" },
        thursday: { start: "09:00", end: "17:00" },
        friday: { start: "09:00", end: "17:00" },
      },
    });

    console.log("🩺 Seeded test physician: Dr. Test Provider, MD");
    console.log("✅ Database test seed completed successfully.");
  } catch (err) {
    console.error("Seeding failed:", err);
  }
}

seed();
