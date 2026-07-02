import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PORTRAIT_LOGIN_LAYOUT, fitsPortraitViewport, fitsPortraitViewportWithAdminMenu } from "../client/src/lib/portraitLayout";

const homeSource = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");

describe("home screen portrait layout and white theme guardrails", () => {
  it("keeps the requested login instruction copy and removes obsolete guidance", () => {
    expect(homeSource).not.toContain("縦型モニター向け全画面フォトブース");
    expect(homeSource).toContain("パスワードを入力し、再生したいBGMを選んだら、パスワードを入れてログインしてください。");
    expect(homeSource).not.toContain("現在のログインパスワードは 1234 です。");
    expect(homeSource).toContain("選択するとログイン前でも試聴できます");
    expect(homeSource).toContain("管理者の方はこちら");
    expect(homeSource).toContain("管理者メニュー");
  });

  it("pins the login card height to the portrait target viewport and uses the updated lighter layout", () => {
    expect(homeSource).toContain("PORTRAIT_LOGIN_LAYOUT.cardMaxHeightPx");
    expect(homeSource).toContain("max-h-[calc(100svh-6.75rem)]");
    expect(homeSource).toContain("md:grid-cols-[minmax(0,0.9fr)_minmax(210px,0.78fr)]");
    expect(homeSource).toContain("md:max-w-[328px] md:justify-self-end");
    expect(PORTRAIT_LOGIN_LAYOUT.targetViewportWidthPx).toBe(1080);
    expect(PORTRAIT_LOGIN_LAYOUT.targetViewportHeightPx).toBe(1920);
    expect(fitsPortraitViewport()).toBe(true);
    expect(fitsPortraitViewportWithAdminMenu()).toBe(true);
  });

  it("uses the new white-stage treatment, stronger floating background art, and the updated camera-stage styling", () => {
    expect(homeSource).toContain("FLOATING_MONSTER_IMAGE_URLS");
    expect(homeSource).toContain("renderFloatingBackdrop()");
    expect(homeSource).toContain("bg-white text-foreground");
    expect(homeSource).toContain("Math.random()");
    expect(homeSource).toContain("const sizePx = 182 + Math.round(Math.random() * 126)");
    expect(homeSource).toContain("const opacity = 0.28 + Math.random() * 0.2");
    expect(homeSource).toContain("border-[8px] border-[#ffd84d] bg-[#ffd84d]");
    expect(homeSource).toContain("text-[#ef4444]");
    expect(homeSource).toContain('justify-start gap-1.5 pt-1 pb-1');
    expect(homeSource).toContain('CAMERA_STAGE_FRAME_MAX_WIDTH_EXPRESSION');
    expect(homeSource).toContain('renderCameraSquare(undefined, CAMERA_STAGE_FRAME_MAX_WIDTH_EXPRESSION)');
    expect(homeSource).toContain('CAMERA_STAGE_COPY_MAX_WIDTH_CLASS');
    expect(homeSource).toContain('w-full ${CAMERA_STAGE_COPY_MAX_WIDTH_CLASS} shrink-0 flex-col items-center gap-1 text-center');
    expect(homeSource).toContain("CAMERA_STAGE_START_TEXT_SIZE_CLASS");
    expect(homeSource).toContain("start-copy-pop");
    expect(homeSource).toContain("Arial_Rounded_MT_Bold");
    expect(homeSource).not.toContain("AIがあなたを珍獣化します！");
    expect(homeSource).not.toContain("選択中の楽曲:");
    expect(homeSource).toContain("handleBgmTrackSelect(track.id)");
    expect(homeSource).toContain("CAMERA_PROMO_VIDEO_URL");
    expect(homeSource).toContain("promoVideoRef");
    expect(homeSource).toContain("promoVideoNeedsTap");
    expect(homeSource).not.toContain('src={CAMERA_PROMO_VIDEO_URL}');
    expect(homeSource).toContain('audio.src = desiredSrc');
    expect(homeSource).toContain('isMediaPlaybackInterruptionError');
    expect(homeSource).toContain('onMouseDown={event => event.stopPropagation()}');
    expect(homeSource).toContain('void syncPromoVideoPlayback(true)');
    expect(homeSource).toContain('stopPromoVideoPlayback(true)');
    expect(homeSource).toContain('動画と音声を再生する');
    expect(homeSource).toContain('startPromoVideoPlayback');
    expect(homeSource).toContain('import { SHUTTER_TRIGGER_KEYS, handleGlobalShutterKeydown } from "@/lib/shutterTrigger";');
    expect(homeSource).toContain('handleGlobalShutterKeydown(event, () => {');
    expect(homeSource).toContain('window.addEventListener("keydown", handleGlobalKeyDown)');
    expect(homeSource).toContain('window.removeEventListener("keydown", handleGlobalKeyDown)');
    expect(homeSource).toContain('const trackCaptureMutation = trpc.signage.trackCaptureIntent.useMutation()');
    expect(homeSource).toContain('const deviceId = useMemo(() => getBoothDeviceId(), [])');
    expect(homeSource).toContain('const timeKeys = getDeviceLocalTimeKeys()');
    expect(homeSource).toContain('import { recordCaptureIntentSafely } from "@/lib/captureIntent";');
    expect(homeSource).toContain('await recordCaptureIntentSafely(trackCaptureMutation, { deviceId, timeKeys });');
    expect(homeSource).toContain('window.sessionStorage.removeItem("signage-admin-unlocked")');
    expect(homeSource).toContain('setLocation("/admin")');
    expect(homeSource).toContain('max-w-[min(68vw,292px)]');
    expect(homeSource).toContain('min-h-[48px]');
    expect(homeSource).toContain('h-11 w-full rounded-[1rem]');
    expect(homeSource).toContain('mt-2 h-11 rounded-[1.1rem]');
  });

  it("moves processing copy outside the frame and shows one random spot-the-difference image inside the yellow square", () => {
    expect(homeSource).toContain("SPOT_DIFFERENCE_IMAGE_URLS");
    expect(homeSource).toContain("pickRandomSpotDifferenceImage");
    expect(homeSource).toContain("setProcessingPuzzleUrl(pickRandomSpotDifferenceImage())");
    expect(homeSource).toContain('src={processingPuzzleUrl}');
    expect(homeSource).toContain('alt="珍獣の間違い探し"');
    expect(homeSource).toContain('PROCESSING_STAGE_FRAME_FLEX');
    expect(homeSource).toContain('PROCESSING_STAGE_BOTTOM_GAP_PX');
    expect(homeSource).toContain('PROCESSING_STAGE_BOTTOM_PADDING_PX');
    expect(homeSource).toContain('PROCESSING_STAGE_ROW_GAP_PX');
    expect(homeSource).toContain('style={{ rowGap: `${PROCESSING_STAGE_ROW_GAP_PX}px`, paddingTop: "6px", paddingBottom: "6px" }}');
    expect(homeSource).toContain('PROCESSING_STAGE_TITLE_SIZE_CLASS');
    expect(homeSource).toContain('renderReceiptGuidance(processingReceipt, "gold", true)');
    expect(homeSource).toContain('style={{ flex: PROCESSING_STAGE_FRAME_FLEX }}');
    expect(homeSource).toContain('style={{ gap: `${PROCESSING_STAGE_BOTTOM_GAP_PX}px`, paddingBottom: `${PROCESSING_STAGE_BOTTOM_PADDING_PX}px` }}');
    expect(homeSource).toContain('不思議な世界を探索中・・・\\nあなただけの珍獣は見つかるかな？\\nもう少し待ってみよう！');
    expect(homeSource).toContain('COMPACT_RECEIPT_LAST_FOUR_SIZE_CLASS');
    expect(homeSource).toContain('PROCESSING_STAGE_MESSAGE_SIZE_CLASS');
    expect(homeSource).toContain('RESULT_STAGE_GUIDANCE_TEXT_SIZE_CLASS');
    expect(homeSource).toContain('受け取りは店内スタッフに受付番号をお伝えください。');
    expect(homeSource).toContain('RESULT_STAGE_CARD_FLEX');
    expect(homeSource).toContain('RESULT_STAGE_ROW_GAP_PX');
    expect(homeSource).toContain('RESULT_STAGE_GUIDANCE_MARGIN_TOP_PX');
    expect(homeSource).toContain('RESULT_STAGE_GUIDANCE_GAP_PX');
    expect(homeSource).toContain('style={{ rowGap: `${RESULT_STAGE_ROW_GAP_PX}px`, paddingTop: "6px", paddingBottom: "6px" }}');
    expect(homeSource).toContain('style={{ flex: RESULT_STAGE_CARD_FLEX }}');
    expect(homeSource).toContain('style={{ marginTop: `${RESULT_STAGE_GUIDANCE_MARGIN_TOP_PX}px`, gap: `${RESULT_STAGE_GUIDANCE_GAP_PX}px` }}');
    expect(homeSource).toContain('border-2 border-[#f59e0b]');
    expect(homeSource).not.toContain('A5・2×4のPNGレイアウトを自動保存');
    expect(homeSource).not.toContain('Math.round(resultAutoReturnMs / 1000)');
    expect(homeSource).not.toContain('absolute inset-x-0 bottom-0 flex flex-col items-center gap-2');
  });
});
