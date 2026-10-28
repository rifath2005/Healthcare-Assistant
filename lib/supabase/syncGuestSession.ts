import { createClient } from "./client";

export interface GuestMessage {
  id?: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
}

const GUEST_STORAGE_KEY = "healthcare_guest_messages";

/**
 * Reads in-memory/local guest messages stored during an anonymous session.
 */
export function getGuestMessages(): GuestMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(GUEST_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Stores guest messages in localStorage.
 */
export function setGuestMessages(messages: GuestMessage[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(messages));
  } catch (e) {
    console.error("Failed to store guest messages:", e);
  }
}

/**
 * Clears stored guest messages after sync.
 */
export function clearGuestMessages() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(GUEST_STORAGE_KEY);
  } catch {
    // Ignore error
  }
}

/**
 * Migrates local guest conversation to Supabase tables upon user authentication.
 */
export async function syncGuestSession(userId: string): Promise<string | null> {
  const guestMessages = getGuestMessages();
  if (!guestMessages || guestMessages.length === 0) return null;

  const supabase = createClient();

  try {
    // 1. Create a new conversation row for the user
    const firstUserMsg = guestMessages.find((m) => m.role === "user");
    const title = firstUserMsg ? firstUserMsg.content.slice(0, 40) + "..." : "Migrated Consultation";

    const { data: conv, error: convError } = await supabase
      .from("conversations")
      .insert({
        user_id: userId,
        title,
      })
      .select("id")
      .single();

    if (convError || !conv) {
      console.error("Error migrating guest conversation:", convError);
      return null;
    }

    // 2. Insert all messages attached to the new conversation
    const messagePayloads = guestMessages.map((m) => ({
      conversation_id: conv.id,
      role: m.role,
      content: m.content,
      metadata: m.metadata || {},
    }));

    const { error: msgError } = await supabase.from("messages").insert(messagePayloads);

    if (msgError) {
      console.error("Error inserting migrated messages:", msgError);
      return null;
    }

    // 3. Clear guest session from local storage
    clearGuestMessages();
    return conv.id;
  } catch (err) {
    console.error("Unexpected error syncing guest session:", err);
    return null;
  }
}
