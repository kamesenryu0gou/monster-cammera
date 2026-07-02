import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { buildAiInputPath, createAiInputImage } from "./routers";

describe("createAiInputImage", () => {
  it("AI入力用画像を左右反転して返す", async () => {
    const source = await sharp(Buffer.from([
      255, 0, 0,
      0, 0, 255,
    ]), {
      raw: {
        width: 2,
        height: 1,
        channels: 3,
      },
    })
      .png()
      .toBuffer();

    const mirrored = await createAiInputImage(source, "image/png");
    const { data, info } = await sharp(mirrored.buffer)
      .raw()
      .toBuffer({ resolveWithObject: true });

    expect(mirrored.mimeType).toBe("image/png");
    expect(mirrored.extension).toBe("png");
    expect(info.width).toBe(2);
    expect(info.height).toBe(1);
    expect(Array.from(data.slice(0, 3))).toEqual([0, 0, 255]);
    expect(Array.from(data.slice(3, 6))).toEqual([255, 0, 0]);
  });

  it("AI入力用画像の保存パスを固定形式で返す", () => {
    expect(buildAiInputPath("20260608-0001", "jpg")).toBe("booth/20260608-0001/ai-input.jpg");
  });
});
