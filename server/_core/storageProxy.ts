import type { Express } from "express";
import { storageGetSignedUrl } from "server/storage";

function buildDownloadName(filename: string | undefined, fallbackKey: string) {
  const raw = filename?.trim() || fallbackKey.split("/").pop() || "download.bin";
  return raw.replace(/[\r\n"]/g, "_");
}

export function registerStorageProxy(app: Express) {
  app.get("/api/download-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string | undefined>)["0"];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    try {
      const signedUrl = await storageGetSignedUrl(key);
      const upstream = await fetch(signedUrl);

      if (!upstream.ok) {
        res.status(502).send("Storage backend error");
        return;
      }

      const buffer = Buffer.from(await upstream.arrayBuffer());
      const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
      const filename = buildDownloadName(
        typeof req.query.filename === "string" ? req.query.filename : undefined,
        key,
      );

      res.set("Cache-Control", "no-store");
      res.set("Content-Type", contentType);
      res.set("Content-Length", String(buffer.byteLength));
      res.set("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
      res.status(200).send(buffer);
    } catch (err) {
      console.error("[StorageProxy download] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });

  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string | undefined>)["0"];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    try {
      const url = await storageGetSignedUrl(key);
      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
