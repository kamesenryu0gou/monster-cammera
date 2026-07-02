import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ENV } from "./_core/env";
import { storageGetSignedUrl, storagePut } from "./storage";

describe("storage retry behavior", () => {
  const originalForgeApiUrl = ENV.forgeApiUrl;
  const originalForgeApiKey = ENV.forgeApiKey;

  beforeEach(() => {
    ENV.forgeApiUrl = "https://forge.example";
    ENV.forgeApiKey = "test-forge-key";
  });

  afterEach(() => {
    ENV.forgeApiUrl = originalForgeApiUrl;
    ENV.forgeApiKey = originalForgeApiKey;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("retries transient 502 errors before completing storagePut", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response("<html><body>502 Bad Gateway</body></html>", {
          status: 502,
          statusText: "Bad Gateway",
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ url: "https://upload.example/signed-put" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }));

    vi.stubGlobal("fetch", fetchMock);

    const result = await storagePut("booth/example.png", Buffer.from("png"), "image/png");

    expect(result.key).toMatch(/^booth\/example_[a-f0-9]{8}\.png$/);
    expect(result.url).toBe(`/manus-storage/${result.key}`);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("v1/storage/presign/put");
    expect(fetchMock.mock.calls[2]?.[1]).toMatchObject({ method: "PUT" });
  });

  it("retries transient 502 errors before returning a signed download URL", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response("<html><body>502 Bad Gateway</body></html>", {
          status: 502,
          statusText: "Bad Gateway",
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ url: "https://download.example/signed-get" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

    vi.stubGlobal("fetch", fetchMock);

    const signedUrl = await storageGetSignedUrl("booth/example.png");

    expect(signedUrl).toBe("https://download.example/signed-get");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("v1/storage/presign/get");
  });
});
