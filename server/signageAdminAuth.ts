import { createHmac, timingSafeEqual } from "node:crypto";
import { ENV } from "./_core/env";

export const SIGNAGE_ADMIN_COOKIE_NAME = "signage_admin_session";
export const SIGNAGE_ADMIN_PASSWORD = "mf1count";
const SIGNAGE_ADMIN_SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 12;

function createSignature(payload: string) {
  return createHmac("sha256", ENV.cookieSecret || "signage-admin-fallback-secret").update(payload).digest("hex");
}

export function createSignageAdminSessionToken(now = Date.now()) {
  const expiresAt = now + SIGNAGE_ADMIN_SESSION_MAX_AGE_MS;
  const payload = String(expiresAt);
  const signature = createSignature(payload);
  return Buffer.from(`${payload}.${signature}`).toString("base64url");
}

export function verifySignageAdminSessionToken(token: string | undefined, now = Date.now()) {
  if (!token) {
    return false;
  }

  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const [payload, signature] = decoded.split(".");
    if (!payload || !signature) {
      return false;
    }

    const expected = createSignature(payload);
    const left = Buffer.from(signature, "utf8");
    const right = Buffer.from(expected, "utf8");
    if (left.length !== right.length || !timingSafeEqual(left, right)) {
      return false;
    }

    const expiresAt = Number(payload);
    return Number.isFinite(expiresAt) && expiresAt > now;
  } catch {
    return false;
  }
}

export function isValidSignageAdminPassword(password: string) {
  return password.normalize("NFKC").trim() === SIGNAGE_ADMIN_PASSWORD;
}

export function getSignageAdminSessionMaxAgeMs() {
  return SIGNAGE_ADMIN_SESSION_MAX_AGE_MS;
}
