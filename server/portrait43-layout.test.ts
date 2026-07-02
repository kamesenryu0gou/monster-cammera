import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CAMERA_STAGE_FRAME_MAX_WIDTH_EXPRESSION,
  CAMERA_STAGE_START_TEXT_SIZE_CLASS,
  COMPACT_RECEIPT_LAST_FOUR_SIZE_CLASS,
  PORTRAIT_43_VIEWPORT_HEIGHT_PX,
  PORTRAIT_43_VIEWPORT_WIDTH_PX,
  PROCESSING_STAGE_MESSAGE_SIZE_CLASS,
  PROCESSING_STAGE_TITLE_SIZE_CLASS,
  RESULT_STAGE_GUIDANCE_TEXT_SIZE_CLASS,
  getPortrait43CameraStageSpareHeightPx,
  getPortrait43ProcessingStageSpareHeightPx,
  getPortrait43ResultStageSpareHeightPx,
  getPortrait43ViewportContentHeightPx,
} from "../client/src/lib/boothLayout";

const homeSource = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");

describe("43-inch portrait booth layout guardrails", () => {
  it("keeps the enlarged camera-stage start message within a single portrait screen using the shared width expression", () => {
    expect(homeSource).toContain("CAMERA_STAGE_FRAME_MAX_WIDTH_EXPRESSION");
    expect(homeSource).toContain("CAMERA_STAGE_START_TEXT_SIZE_CLASS");
    expect(CAMERA_STAGE_FRAME_MAX_WIDTH_EXPRESSION).toBe("min(82vw, calc(100svh - 17.5rem), 760px)");
    expect(CAMERA_STAGE_START_TEXT_SIZE_CLASS).toBe("text-[clamp(3.8rem,7.2vw,5.8rem)]");
    expect(getPortrait43ViewportContentHeightPx()).toBeLessThan(PORTRAIT_43_VIEWPORT_HEIGHT_PX);
    expect(getPortrait43CameraStageSpareHeightPx({
      viewportWidthPx: PORTRAIT_43_VIEWPORT_WIDTH_PX,
      viewportHeightPx: PORTRAIT_43_VIEWPORT_HEIGHT_PX,
    })).toBeGreaterThan(120);
  });

  it("keeps the enlarged processing copy and receipt clear of the puzzle frame with shared layout math", () => {
    expect(homeSource).toContain("PROCESSING_STAGE_TITLE_SIZE_CLASS");
    expect(homeSource).toContain("PROCESSING_STAGE_MESSAGE_SIZE_CLASS");
    expect(homeSource).toContain("COMPACT_RECEIPT_LAST_FOUR_SIZE_CLASS");
    expect(PROCESSING_STAGE_TITLE_SIZE_CLASS).toBe("text-[clamp(2.45rem,5vw,4rem)]");
    expect(PROCESSING_STAGE_MESSAGE_SIZE_CLASS).toBe("text-[clamp(1.45rem,2.9vw,1.95rem)]");
    expect(COMPACT_RECEIPT_LAST_FOUR_SIZE_CLASS).toBe("text-[4.4rem] sm:text-[5.4rem]");
    expect(getPortrait43ProcessingStageSpareHeightPx({
      viewportWidthPx: PORTRAIT_43_VIEWPORT_WIDTH_PX,
      viewportHeightPx: PORTRAIT_43_VIEWPORT_HEIGHT_PX,
    })).toBeGreaterThan(180);
  });

  it("keeps the enlarged result receipt and guidance within one screen without overlapping the preview", () => {
    expect(homeSource).toContain("RESULT_STAGE_GUIDANCE_TEXT_SIZE_CLASS");
    expect(RESULT_STAGE_GUIDANCE_TEXT_SIZE_CLASS).toBe("text-[1.55rem] sm:text-[1.95rem]");
    expect(getPortrait43ResultStageSpareHeightPx({ viewportHeightPx: PORTRAIT_43_VIEWPORT_HEIGHT_PX })).toBeGreaterThan(120);
  });
});
