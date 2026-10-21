import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH = 16;
const CURRENT_KEY_VERSION = 1;

/**
 * Derives a 32-byte key from environment master secret using HKDF.
 * Master secret can be provided via CREDENTIAL_ENCRYPTION_KEY or a secure fallback.
 */
function getMasterKey(): Buffer {
  const secret = process.env.CREDENTIAL_ENCRYPTION_KEY || "content-discovery-platform-master-key-change-in-prod-32b!";
  const derived = crypto.hkdfSync(
    "sha256",
    Buffer.from(secret, "utf-8"),
    Buffer.from("discovery-salt-2026", "utf-8"),
    Buffer.from("api-credentials-v1", "utf-8"),
    32
  );
  return Buffer.from(derived);
}

export interface EncryptedData {
  ciphertext: string; // hex
  iv: string; // hex
  authTag: string; // hex
  keyVersion: number;
}

/**
 * Encrypts a plaintext secret using AES-256-GCM.
 */
export function encryptSecret(plaintext: string): EncryptedData {
  const key = getMasterKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return {
    ciphertext: encrypted,
    iv: iv.toString("hex"),
    authTag,
    keyVersion: CURRENT_KEY_VERSION,
  };
}

/**
 * Decrypts ciphertext using AES-256-GCM and verifies authentication tag.
 * Throws if auth tag verification fails (tampering detected).
 */
export function decryptSecret(ciphertext: string, ivHex: string, authTagHex: string): string {
  const key = getMasterKey();
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

/**
 * Safely masks an API key or secret token for display in the UI.
 * e.g. "AIzaSyD8947239487" -> "AIza...487"
 */
export function maskApiKey(key: string): string {
  if (!key) return "";
  const trimmed = key.trim();
  if (trimmed.length <= 8) {
    return "••••••••";
  }
  const prefix = trimmed.slice(0, 4);
  const suffix = trimmed.slice(-4);
  return `${prefix}••••••••${suffix}`;
}

/**
 * Computes a secure SHA-256 hash (e.g. for session tokens or IP anonymization).
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
