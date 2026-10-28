import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const targetEmail = process.argv[2];

if (!targetEmail) {
  console.log("Usage: npx tsx scripts/promote_admin.ts <user-email>");
  process.exit(1);
}

async function promoteAdmin() {
  const adminClient = createClient(supabaseUrl!, serviceRoleKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`🔍 Searching for profile with email: ${targetEmail}...`);

  const { data: profile, error: findError } = await adminClient
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("email", targetEmail.trim().toLowerCase())
    .single();

  if (findError || !profile) {
    console.error(`❌ User not found with email: ${targetEmail}`);
    process.exit(1);
  }

  console.log(`Current profile: ID=${profile.id}, Name=${profile.full_name}, Role=${profile.role}`);

  const { data: updated, error: updateError } = await adminClient
    .from("profiles")
    .update({ role: "admin", updated_at: new Date().toISOString() })
    .eq("id", profile.id)
    .select("id, email, role")
    .single();

  if (updateError) {
    console.error("❌ Failed to promote user:", updateError);
    process.exit(1);
  }

  console.log(`✅ Success! User ${updated.email} is now an administrator (${updated.role}).`);
}

promoteAdmin();
