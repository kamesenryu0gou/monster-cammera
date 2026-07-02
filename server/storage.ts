// Preconfigured storage helpers for Manus WebDev templates
// Uploads via Forge Server presigned URL to S3 (PUT direct).
// Downloads return /manus-storage/{key} paths served via 307 redirect.

import { ENV } from "./_core/env";

const FORGE_MAX_ATTEMPTS = 3;
const FORGE_RETRY_DELAY_MS = 300;

function getForgeConfig() {
  const forgeUrl = ENV.forgeApiUrl;
  const forgeKey = ENV.forgeApiKey;

  if (!forgeUrl || !forgeKey) {
    throw new Error(
      "Storage config missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY",
    );
  }

  return { forgeUrl: forgeUrl.replace(/\/+$/, ""), forgeKey };
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

function isRetryableStatus(status: number) {
  return status >= 500 && status < 600;
}

async function delay(ms: number) {
  await new Promise(resolve => setTimeout(resolve, ms));
}

async function requestForgeSignedUrl(
  endpoint: "v1/storage/presign/put" | "v1/storage/presign/get",
  key: string,
  errorLabel: "Storage presign failed" | "Storage signed URL failed",
): Promise<string> {
  const { forgeUrl, forgeKey } = getForgeConfig();
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= FORGE_MAX_ATTEMPTS; attempt += 1) {
    try {
      const requestUrl = new URL(endpoint, `${forgeUrl}/`);
      requestUrl.searchParams.set("path", key);

      const response = await fetch(requestUrl, {
        headers: { Authorization: `Bearer ${forgeKey}` },
      });

      if (response.ok) {
        const { url } = (await response.json()) as { url?: string };
        if (!url) {
          throw new Error("Forge returned empty presign URL");
        }
        return url;
      }

      const detail = await response.text().catch(() => response.statusText);
      const failure = new Error(`${errorLabel} (${response.status}): ${detail}`);
      lastError = failure;

      if (!isRetryableStatus(response.status) || attempt === FORGE_MAX_ATTEMPTS) {
        throw failure;
      }
    } catch (error) {
      const failure = error instanceof Error ? error : new Error(String(error));
      lastError = failure;
      if (attempt === FORGE_MAX_ATTEMPTS) {
        throw failure;
      }
    }

    await delay(FORGE_RETRY_DELAY_MS * attempt);
  }

  throw lastError ?? new Error(`${errorLabel}: unknown error`);
}

async function uploadToSignedUrl(
  signedUrl: string,
  data: Buffer | Uint8Array | string,
  contentType: string,
) {
  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([data as BlobPart], { type: contentType });

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= FORGE_MAX_ATTEMPTS; attempt += 1) {
    try {
      const uploadResp = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: blob,
      });

      if (uploadResp.ok) {
        return;
      }

      const failure = new Error(`Storage upload to S3 failed (${uploadResp.status})`);
      lastError = failure;
      if (!isRetryableStatus(uploadResp.status) || attempt === FORGE_MAX_ATTEMPTS) {
        throw failure;
      }
    } catch (error) {
      const failure = error instanceof Error ? error : new Error(String(error));
      lastError = failure;
      if (attempt === FORGE_MAX_ATTEMPTS) {
        throw failure;
      }
    }

    await delay(FORGE_RETRY_DELAY_MS * attempt);
  }

  throw lastError ?? new Error("Storage upload to S3 failed");
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));
  const signedPutUrl = await requestForgeSignedUrl("v1/storage/presign/put", key, "Storage presign failed");

  await uploadToSignedUrl(signedPutUrl, data, contentType);

  return { key, url: `/manus-storage/${key}` };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: `/manus-storage/${key}` };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const key = normalizeKey(relKey);
  return requestForgeSignedUrl("v1/storage/presign/get", key, "Storage signed URL failed");
}
