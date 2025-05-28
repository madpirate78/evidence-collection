// utils/secureId.ts
import crypto from "crypto";

const ENCRYPTION_KEY =
  process.env.ID_ENCRYPTION_KEY || "default-key-change-in-production";
const IV_LENGTH = 16;
const ALGORITHM = "aes-256-cbc";

/**
 * Encrypts a numeric ID to a URL-safe string (Server-side only)
 */
export function encryptId(id: number | string): string {
  try {
    const key = crypto.createHash("sha256").update(ENCRYPTION_KEY).digest();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(id.toString(), "utf8", "hex");
    encrypted += cipher.final("hex");

    // Combine IV and encrypted data, then make URL-safe
    const combined = iv.toString("hex") + ":" + encrypted;
    return Buffer.from(combined).toString("base64url");
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error("Failed to encrypt ID");
  }
}

/**
 * Decrypts a URL-safe string back to numeric ID (Server-side only)
 */
export function decryptId(encryptedId: string): number {
  try {
    const combined = Buffer.from(encryptedId, "base64url").toString();
    const [ivHex, encrypted] = combined.split(":");

    const key = crypto.createHash("sha256").update(ENCRYPTION_KEY).digest();
    const iv = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return parseInt(decrypted, 10);
  } catch (error) {
    console.error("Decryption error:", error);
    throw new Error("Invalid submission ID");
  }
}

/**
 * Browser-safe base64 encoding
 */
function browserBase64Encode(str: string): string {
  if (typeof window !== "undefined") {
    // Browser environment
    return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  } else {
    // Node.js environment
    return Buffer.from(str).toString("base64url");
  }
}

/**
 * Browser-safe base64 decoding
 */
function browserBase64Decode(str: string): string {
  if (typeof window !== "undefined") {
    // Browser environment - convert back to standard base64
    let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
    // Add padding if needed
    while (base64.length % 4) {
      base64 += "=";
    }
    return atob(base64);
  } else {
    // Node.js environment
    return Buffer.from(str, "base64url").toString();
  }
}

/**
 * Client-safe ID operations (works in both browser and Node.js)
 */
export const clientSafeId = {
  encode: (id: number): string => {
    // Add some obfuscation
    const obfuscated = (id * 9973 + 49999).toString();
    return browserBase64Encode(obfuscated);
  },

  decode: (encoded: string): number => {
    try {
      const obfuscated = parseInt(browserBase64Decode(encoded), 10);
      return Math.floor((obfuscated - 49999) / 9973);
    } catch {
      throw new Error("Invalid ID");
    }
  },
};

// Use the appropriate method based on environment
export const secureId =
  typeof window === "undefined"
    ? { encode: encryptId, decode: decryptId }
    : clientSafeId;
