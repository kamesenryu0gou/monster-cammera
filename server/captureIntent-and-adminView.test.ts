import { describe, expect, it, vi } from "vitest";
import { getAdminAnalyticsViewState } from "../client/src/lib/adminAnalyticsView";
import { recordCaptureIntentSafely } from "../client/src/lib/captureIntent";

describe("capture intent fail-open behavior", () => {
  it("returns true when analytics logging succeeds", async () => {
    const mutation = {
      mutateAsync: vi.fn().mockResolvedValue({ success: true }),
    };

    const result = await recordCaptureIntentSafely(mutation, {
      deviceId: "device-alpha",
      timeKeys: {
        localDateKey: "2026-06-26",
        localHourKey: "2026-06-26 10",
      },
    });

    expect(result).toBe(true);
    expect(mutation.mutateAsync).toHaveBeenCalledWith({
      deviceId: "device-alpha",
      localDateKey: "2026-06-26",
      localHourKey: "2026-06-26 10",
    });
  });

  it("returns false and logs a warning when analytics logging fails without throwing", async () => {
    const logger = vi.fn();
    const mutation = {
      mutateAsync: vi.fn().mockRejectedValue(new Error("analytics unavailable")),
    };

    const result = await recordCaptureIntentSafely(
      mutation,
      {
        deviceId: "device-beta",
        timeKeys: {
          localDateKey: "2026-06-26",
          localHourKey: "2026-06-26 11",
        },
      },
      logger,
    );

    expect(result).toBe(false);
    expect(logger).toHaveBeenCalledOnce();
    expect(logger.mock.calls[0]?.[0]).toBe("[Analytics] Failed to record capture intent");
  });
});

describe("admin analytics view state", () => {
  it("prioritizes loading and error over device counts", () => {
    expect(getAdminAnalyticsViewState({ isLoading: true, hasError: false, deviceCount: 10 })).toBe("loading");
    expect(getAdminAnalyticsViewState({ isLoading: false, hasError: true, deviceCount: 10 })).toBe("error");
  });

  it("returns empty when there are no devices and ready when devices exist", () => {
    expect(getAdminAnalyticsViewState({ isLoading: false, hasError: false, deviceCount: 0 })).toBe("empty");
    expect(getAdminAnalyticsViewState({ isLoading: false, hasError: false, deviceCount: 3 })).toBe("ready");
  });
});
