export const PROCESSING_STAGE_ROW_GAP_PX = 4;
export const PROCESSING_STAGE_FRAME_FLEX = 0.9;
export const PROCESSING_STAGE_BOTTOM_GAP_PX = 2;
export const PROCESSING_STAGE_BOTTOM_PADDING_PX = 12;

export const RESULT_STAGE_ROW_GAP_PX = 6;
export const RESULT_STAGE_CARD_FLEX = 0.99;
export const RESULT_STAGE_GUIDANCE_MARGIN_TOP_PX = 2;
export const RESULT_STAGE_GUIDANCE_GAP_PX = 4;

export const PORTRAIT_43_VIEWPORT_WIDTH_PX = 1080;
export const PORTRAIT_43_VIEWPORT_HEIGHT_PX = 1920;
export const STAGE_VERTICAL_PADDING_PX = 32;
export const REM_PX = 16;

export const CAMERA_STAGE_FRAME_MAX_WIDTH_EXPRESSION = "min(82vw, calc(100svh - 17.5rem), 760px)";
export const CAMERA_STAGE_COPY_MAX_WIDTH_CLASS = "max-w-[min(82vw,760px)]";
export const CAMERA_STAGE_START_TEXT_SIZE_CLASS = "text-[clamp(3.8rem,7.2vw,5.8rem)]";
export const CAMERA_STAGE_FRAME_WIDTH_RATIO = 0.82;
export const CAMERA_STAGE_FRAME_MAX_PX = 760;
export const CAMERA_STAGE_BOTTOM_SECTION_FLEX = 0.72;
export const CAMERA_STAGE_COPY_GAP_PX = 4;
export const CAMERA_STAGE_START_TEXT_MAX_REM = 5.8;
export const CAMERA_STAGE_START_TEXT_LINE_HEIGHT = 0.9;
export const CAMERA_STAGE_START_TEXT_LINE_COUNT = 2;

export const PROCESSING_STAGE_FRAME_WIDTH_RATIO = 0.88;
export const PROCESSING_STAGE_TITLE_SIZE_CLASS = "text-[clamp(2.45rem,5vw,4rem)]";
export const PROCESSING_STAGE_MESSAGE_SIZE_CLASS = "text-[clamp(1.45rem,2.9vw,1.95rem)]";
export const COMPACT_RECEIPT_LAST_FOUR_SIZE_CLASS = "text-[4.4rem] sm:text-[5.4rem]";
export const PROCESSING_STAGE_TITLE_MAX_REM = 4;
export const PROCESSING_STAGE_TOP_BLOCK_GAP_PX = 4;
export const PROCESSING_STAGE_DOTS_HEIGHT_PX = 12;
export const PROCESSING_STAGE_MESSAGE_MAX_REM = 1.95;
export const PROCESSING_STAGE_MESSAGE_LINE_HEIGHT = 1.38;
export const PROCESSING_STAGE_MESSAGE_LINE_COUNT = 3;
export const COMPACT_RECEIPT_LAST_FOUR_MAX_REM = 5.4;

export const RESULT_STAGE_BADGE_SIZE_CLASS = "text-[1.9rem] sm:text-[2.45rem]";
export const RESULT_STAGE_GUIDANCE_TEXT_SIZE_CLASS = "text-[1.55rem] sm:text-[1.95rem]";
export const RESULT_STAGE_BADGE_MAX_REM = 2.45;
export const RESULT_STAGE_BADGE_CHROME_PX = 28;
export const RESULT_STAGE_CARD_MAX_WIDTH_PX = 700;
export const RESULT_STAGE_CARD_HORIZONTAL_PADDING_PX = 28;
export const RESULT_STAGE_PREVIEW_ASPECT_RATIO = 210 / 148;
export const RESULT_STAGE_GUIDANCE_TEXT_MAX_REM = 1.95;
export const RESULT_STAGE_GUIDANCE_LINE_HEIGHT = 1.1;
export const RESULT_STAGE_GUIDANCE_LINE_COUNT = 2;
export const RESULT_STAGE_GUIDANCE_CHROME_PX = 44;

export type StageViewportMetrics = {
  clientHeightPx: number;
  scrollHeightPx: number;
};

export function getProcessingStageGuaranteedClearancePx({
  rowGapPx = PROCESSING_STAGE_ROW_GAP_PX,
}: {
  rowGapPx?: number;
} = {}) {
  return rowGapPx;
}

export function getResultStageGuaranteedClearancePx({
  guidanceMarginTopPx = RESULT_STAGE_GUIDANCE_MARGIN_TOP_PX,
}: {
  guidanceMarginTopPx?: number;
} = {}) {
  return guidanceMarginTopPx;
}

export function getPortrait43ViewportContentHeightPx({
  viewportHeightPx = PORTRAIT_43_VIEWPORT_HEIGHT_PX,
  stageVerticalPaddingPx = STAGE_VERTICAL_PADDING_PX,
}: {
  viewportHeightPx?: number;
  stageVerticalPaddingPx?: number;
} = {}) {
  return viewportHeightPx - stageVerticalPaddingPx;
}

export function getPortrait43CameraStageSpareHeightPx({
  viewportWidthPx = PORTRAIT_43_VIEWPORT_WIDTH_PX,
  viewportHeightPx = PORTRAIT_43_VIEWPORT_HEIGHT_PX,
}: {
  viewportWidthPx?: number;
  viewportHeightPx?: number;
} = {}) {
  const contentHeightPx = getPortrait43ViewportContentHeightPx({ viewportHeightPx });
  const bottomSectionHeightPx = contentHeightPx * CAMERA_STAGE_BOTTOM_SECTION_FLEX;
  const cameraFrameSizePx = Math.min(viewportWidthPx * CAMERA_STAGE_FRAME_WIDTH_RATIO, CAMERA_STAGE_FRAME_MAX_PX);
  const startCopyLinePx = CAMERA_STAGE_START_TEXT_MAX_REM * REM_PX * CAMERA_STAGE_START_TEXT_LINE_HEIGHT;
  const startCopyHeightPx = startCopyLinePx * CAMERA_STAGE_START_TEXT_LINE_COUNT;

  return bottomSectionHeightPx - (cameraFrameSizePx + startCopyHeightPx + CAMERA_STAGE_COPY_GAP_PX);
}

export function getPortrait43ProcessingStageSpareHeightPx({
  viewportWidthPx = PORTRAIT_43_VIEWPORT_WIDTH_PX,
  viewportHeightPx = PORTRAIT_43_VIEWPORT_HEIGHT_PX,
}: {
  viewportWidthPx?: number;
  viewportHeightPx?: number;
} = {}) {
  const contentHeightPx = getPortrait43ViewportContentHeightPx({ viewportHeightPx });
  const topBlockHeightPx = PROCESSING_STAGE_TITLE_MAX_REM * REM_PX + PROCESSING_STAGE_DOTS_HEIGHT_PX + PROCESSING_STAGE_TOP_BLOCK_GAP_PX;
  const frameSizePx = Math.min(viewportWidthPx * PROCESSING_STAGE_FRAME_WIDTH_RATIO, CAMERA_STAGE_FRAME_MAX_PX);
  const messageLinePx = PROCESSING_STAGE_MESSAGE_MAX_REM * REM_PX * PROCESSING_STAGE_MESSAGE_LINE_HEIGHT;
  const messageHeightPx = messageLinePx * PROCESSING_STAGE_MESSAGE_LINE_COUNT;
  const compactReceiptHeightPx = COMPACT_RECEIPT_LAST_FOUR_MAX_REM * REM_PX;
  const bottomBlockHeightPx =
    messageHeightPx + compactReceiptHeightPx + PROCESSING_STAGE_BOTTOM_GAP_PX + PROCESSING_STAGE_BOTTOM_PADDING_PX;
  const availableFrameHeightPx = contentHeightPx - topBlockHeightPx - bottomBlockHeightPx - PROCESSING_STAGE_ROW_GAP_PX * 2;

  return availableFrameHeightPx - frameSizePx;
}

export function getPortrait43ResultStageSpareHeightPx({
  viewportHeightPx = PORTRAIT_43_VIEWPORT_HEIGHT_PX,
}: {
  viewportHeightPx?: number;
} = {}) {
  const contentHeightPx = getPortrait43ViewportContentHeightPx({ viewportHeightPx });
  const badgeHeightPx = RESULT_STAGE_BADGE_MAX_REM * REM_PX + RESULT_STAGE_BADGE_CHROME_PX;
  const previewWidthPx = RESULT_STAGE_CARD_MAX_WIDTH_PX - RESULT_STAGE_CARD_HORIZONTAL_PADDING_PX;
  const previewHeightPx = previewWidthPx * RESULT_STAGE_PREVIEW_ASPECT_RATIO;
  const receiptHeightPx = COMPACT_RECEIPT_LAST_FOUR_MAX_REM * REM_PX;
  const guidanceLinePx = RESULT_STAGE_GUIDANCE_TEXT_MAX_REM * REM_PX * RESULT_STAGE_GUIDANCE_LINE_HEIGHT;
  const guidanceTextHeightPx = guidanceLinePx * RESULT_STAGE_GUIDANCE_LINE_COUNT;
  const guidanceBlockHeightPx =
    receiptHeightPx +
    guidanceTextHeightPx +
    RESULT_STAGE_GUIDANCE_GAP_PX +
    RESULT_STAGE_GUIDANCE_MARGIN_TOP_PX +
    RESULT_STAGE_GUIDANCE_CHROME_PX;
  const cardContentHeightPx = previewHeightPx + guidanceBlockHeightPx + RESULT_STAGE_CARD_HORIZONTAL_PADDING_PX;
  const availableCardHeightPx = contentHeightPx - badgeHeightPx - RESULT_STAGE_ROW_GAP_PX;

  return availableCardHeightPx - cardContentHeightPx;
}

function toViewportMetrics(spareHeightPx: number, viewportHeightPx: number): StageViewportMetrics {
  return {
    clientHeightPx: viewportHeightPx,
    scrollHeightPx: viewportHeightPx - Math.max(spareHeightPx, 0),
  };
}

export function getPortrait43CameraStageViewportMetrics({
  viewportWidthPx = PORTRAIT_43_VIEWPORT_WIDTH_PX,
  viewportHeightPx = PORTRAIT_43_VIEWPORT_HEIGHT_PX,
}: {
  viewportWidthPx?: number;
  viewportHeightPx?: number;
} = {}): StageViewportMetrics {
  return toViewportMetrics(
    getPortrait43CameraStageSpareHeightPx({ viewportWidthPx, viewportHeightPx }),
    viewportHeightPx,
  );
}

export function getPortrait43ProcessingStageViewportMetrics({
  viewportWidthPx = PORTRAIT_43_VIEWPORT_WIDTH_PX,
  viewportHeightPx = PORTRAIT_43_VIEWPORT_HEIGHT_PX,
}: {
  viewportWidthPx?: number;
  viewportHeightPx?: number;
} = {}): StageViewportMetrics {
  return toViewportMetrics(
    getPortrait43ProcessingStageSpareHeightPx({ viewportWidthPx, viewportHeightPx }),
    viewportHeightPx,
  );
}

export function getPortrait43ResultStageViewportMetrics({
  viewportHeightPx = PORTRAIT_43_VIEWPORT_HEIGHT_PX,
}: {
  viewportHeightPx?: number;
} = {}): StageViewportMetrics {
  return toViewportMetrics(getPortrait43ResultStageSpareHeightPx({ viewportHeightPx }), viewportHeightPx);
}
