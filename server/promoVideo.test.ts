import { describe, expect, it, vi } from "vitest";
import { startPromoVideoPlayback, stopPromoVideoPlayback, syncPromoVideoSource, type PromoVideoLike } from "../client/src/lib/promoVideo";

function createVideoMock(overrides: Partial<PromoVideoLike> = {}): PromoVideoLike {
  return {
    src: "",
    currentTime: 12,
    loop: false,
    muted: true,
    volume: 0,
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    ...overrides,
  };
}

describe("promoVideo helpers", () => {
  it("applies the storage URL only when needed", () => {
    const video = createVideoMock();
    syncPromoVideoSource(video, "/manus-storage/chinju_camera_3_c3e3d1cb.mp4", "https://example.com");
    expect(video.src).toBe("https://example.com/manus-storage/chinju_camera_3_c3e3d1cb.mp4");

    syncPromoVideoSource(video, "/manus-storage/chinju_camera_3_c3e3d1cb.mp4", "https://example.com");
    expect(video.src).toBe("https://example.com/manus-storage/chinju_camera_3_c3e3d1cb.mp4");
  });

  it("starts playback from the beginning with audio enabled when requested", async () => {
    const video = createVideoMock();
    const started = await startPromoVideoPlayback(video, "/manus-storage/chinju_camera_3_c3e3d1cb.mp4", "https://example.com", true);

    expect(started).toBe(true);
    expect(video.currentTime).toBe(0);
    expect(video.loop).toBe(true);
    expect(video.muted).toBe(false);
    expect(video.volume).toBe(1);
    expect(video.play).toHaveBeenCalledTimes(1);
  });

  it("returns false when autoplay is rejected so the UI can show a manual retry", async () => {
    const video = createVideoMock({
      play: vi.fn().mockRejectedValue(new Error("autoplay blocked")),
    });

    const started = await startPromoVideoPlayback(video, "/manus-storage/chinju_camera_3_c3e3d1cb.mp4", "https://example.com", false);
    expect(started).toBe(false);
  });

  it("pauses and rewinds the promo video when capture starts or the stage changes", () => {
    const video = createVideoMock();
    stopPromoVideoPlayback(video, true);

    expect(video.pause).toHaveBeenCalledTimes(1);
    expect(video.currentTime).toBe(0);
  });
});
