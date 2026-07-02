import { beforeEach, describe, expect, it, vi } from "vitest";

const storagePutMock = vi.fn();

vi.mock("server/storage", () => ({
  storagePut: (...args: unknown[]) => storagePutMock(...args),
}));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  process.env.OPENAI_API_KEY = "test-openai-key";
});

describe("generateImage", () => {
  it("stores the generated image automatically after the OpenAI image edit API returns base64 output", async () => {
    storagePutMock.mockResolvedValue({
      key: "generated/final.png",
      url: "/manus-storage/generated/final.png",
    });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            b64_json: Buffer.from("generated-image-bytes").toString("base64"),
          },
        ],
      }),
    });

    vi.stubGlobal("fetch", fetchMock);

    const { generateImage } = await import("./imageGeneration");
    const result = await generateImage({
      prompt: "Turn this family into cute monster characters",
      originalImages: [{ url: "https://example.com/source.jpg", mimeType: "image/jpeg" }],
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.openai.com/v1/images/edits");

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(request.method).toBe("POST");
    expect(request.headers).toMatchObject({
      Authorization: "Bearer test-openai-key",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(String(request.body))).toMatchObject({
      model: "gpt-image-1.5",
      prompt: "Turn this family into cute monster characters",
      images: [{ image_url: "https://example.com/source.jpg" }],
      input_fidelity: "high",
      output_format: "png",
      quality: "medium",
      size: "1024x1024",
      background: "opaque",
      moderation: "auto",
      n: 1,
    });

    expect(storagePutMock).toHaveBeenCalledTimes(1);
    expect(storagePutMock.mock.calls[0]?.[0]).toMatch(/^generated\/\d+\.png$/);
    expect(storagePutMock.mock.calls[0]?.[2]).toBe("image/png");
    expect(result).toEqual({ url: "/manus-storage/generated/final.png" });
  });
});
