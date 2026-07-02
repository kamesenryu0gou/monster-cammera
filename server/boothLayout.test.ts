import { describe, expect, it } from "vitest";
import {
  PROCESSING_STAGE_BOTTOM_PADDING_PX,
  PROCESSING_STAGE_FRAME_FLEX,
  PROCESSING_STAGE_ROW_GAP_PX,
  RESULT_STAGE_CARD_FLEX,
  RESULT_STAGE_GUIDANCE_MARGIN_TOP_PX,
  RESULT_STAGE_ROW_GAP_PX,
  getProcessingStageGuaranteedClearancePx,
  getResultStageGuaranteedClearancePx,
} from "../client/src/lib/boothLayout";

describe("booth layout guardrails", () => {
  it("keeps the processing-stage copy block clear of the puzzle frame with the live row-gap setting", () => {
    const clearancePx = getProcessingStageGuaranteedClearancePx();

    expect(PROCESSING_STAGE_FRAME_FLEX).toBeGreaterThanOrEqual(0.9);
    expect(PROCESSING_STAGE_FRAME_FLEX).toBeLessThan(1);
    expect(PROCESSING_STAGE_ROW_GAP_PX).toBe(4);
    expect(PROCESSING_STAGE_BOTTOM_PADDING_PX).toBe(12);
    expect(clearancePx).toBe(PROCESSING_STAGE_ROW_GAP_PX);
    expect(clearancePx).toBeGreaterThan(0);
    expect(clearancePx).toBeLessThanOrEqual(6);
  });

  it("keeps the result-stage guidance block clear of the preview with the live top-margin setting", () => {
    const clearancePx = getResultStageGuaranteedClearancePx();

    expect(RESULT_STAGE_CARD_FLEX).toBeGreaterThanOrEqual(0.99);
    expect(RESULT_STAGE_CARD_FLEX).toBeLessThanOrEqual(1);
    expect(RESULT_STAGE_ROW_GAP_PX).toBe(6);
    expect(RESULT_STAGE_GUIDANCE_MARGIN_TOP_PX).toBe(2);
    expect(clearancePx).toBe(RESULT_STAGE_GUIDANCE_MARGIN_TOP_PX);
    expect(clearancePx).toBeGreaterThan(0);
    expect(clearancePx).toBeLessThanOrEqual(4);
  });

  it("reports overlap when the configured clearances are removed", () => {
    expect(getProcessingStageGuaranteedClearancePx({ rowGapPx: 0 })).toBe(0);
    expect(getResultStageGuaranteedClearancePx({ guidanceMarginTopPx: 0 })).toBe(0);
  });
});
