import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("ENCRYPTION_KEY não configurada.");
  }

  // Aceita hex (64 chars) ou base64 (resultando em 32 bytes).
  const key = /^[0-9a-fA-F]{64}$/.test(raw)
    ? Buffer.from(raw, "hex")
    : Buffer.from(raw, "base64");

  if (key.length !== 32) {
    throw new Error("ENCRYPTION_KEY deve representar 32 bytes (hex de 64 chars ou base64).");
  }

  return key;
}

/**
 * Cifra um texto com AES-256-GCM.
 * Formato de saída: base64(iv).base64(authTag).base64(ciphertext)
 */
export function encryptToken(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(".");
}

/** Decifra um payload gerado por {@link encryptToken}. */
export function decryptToken(payload: string): string {
  const parts = payload.split(".");
  if (parts.length !== 3) {
    throw new Error("Payload de token criptografado inválido.");
  }

  const [ivB64, authTagB64, dataB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const data = Buffer.from(dataB64, "base64");

  if (authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error("Auth tag inválida no token criptografado.");
  }

  const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
