import crypto from "crypto";
import { env } from "@/lib/env";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits for GCM
const TAG_LENGTH = 16; // 128-bit authentication tag

function getKeyBuffer(): Buffer {
  const rawKey = env.CLINICAL_ENCRYPTION_KEY || "0123456789abcdef0123456789abcdef";
  // Create deterministic 32-byte hash of the key
  return crypto.createHash("sha256").update(rawKey).digest();
}

/**
 * Encrypts sensitive clinical text using AES-256-GCM.
 * Output format: `enc:iv.authTag.ciphertext` (Base64 encoded)
 */
export function encryptClinicalText(plainText: string): string {
  if (!plainText) return plainText;

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKeyBuffer(), iv, {
    authTagLength: TAG_LENGTH,
  });

  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `enc:${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`;
}

/**
 * Decrypts AES-256-GCM encrypted clinical text.
 * Gracefully returns unencrypted text if not prefixed with `enc:`.
 */
export function decryptClinicalText(cipherPayload: string): string {
  if (!cipherPayload || !cipherPayload.startsWith("enc:")) {
    return cipherPayload;
  }

  try {
    const parts = cipherPayload.slice(4).split(".");
    if (parts.length !== 3) return cipherPayload;

    const iv = Buffer.from(parts[0], "base64");
    const tag = Buffer.from(parts[1], "base64");
    const encrypted = Buffer.from(parts[2], "base64");

    const decipher = crypto.createDecipheriv(ALGORITHM, getKeyBuffer(), iv, {
      authTagLength: TAG_LENGTH,
    });
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString("utf8");
  } catch (error) {
    console.error("Clinical note decryption error:", error);
    return "[Encrypted Record]";
  }
}
