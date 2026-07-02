import { describe, expect, it, vi } from "vitest";
import { executeCaptureFlow } from "../client/src/lib/captureFlow";

describe("executeCaptureFlow", () => {
  it("continues countdown, prepare, and result callbacks even when analytics recording resolves after failure handling", async () => {
    const callOrder: string[] = [];
    const onCountdownChange = vi.fn((value: number | null) => {
      callOrder.push(`countdown:${value}`);
    });
    const onProcessingStart = vi.fn(() => {
      callOrder.push("processing");
    });
    const onResult = vi.fn(() => {
      callOrder.push("result");
    });
    const onError = vi.fn();

    await executeCaptureFlow({
      recordCaptureIntent: vi.fn().mockResolvedValue(false),
      countdownSequence: [3, 2, 1],
      wait: vi.fn().mockResolvedValue(undefined),
      onCountdownChange,
      captureSquareImage: vi.fn(() => "data:image/png;base64,abc"),
      prepareCapture: vi.fn(async () => ({
        jobId: "20260626-0001",
        formattedReceipt: "20260626-0001",
      })),
      onProcessingStart,
      processCapture: vi.fn(async () => ({
        jobId: "20260626-0001",
        formattedReceipt: "20260626-0001",
        displayNumber: "0001",
        status: "completed",
        subjectCount: 1,
        assignedVariants: [],
        generatedImageUrl: "/manus-storage/result.png",
        printLayoutUrl: "/manus-storage/layout.png",
      })),
      onResult,
      onError,
    });

    expect(onError).not.toHaveBeenCalled();
    expect(callOrder).toEqual(["countdown:3", "countdown:2", "countdown:1", "countdown:null", "processing", "result"]);
  });
});
