export type PreparedCapture = {
  jobId: string;
  formattedReceipt: string;
};

export async function executeCaptureFlow<
  TPrepared extends PreparedCapture,
  TResult extends {
    generatedImageUrl?: string | null;
    printLayoutUrl?: string | null;
  },
>(input: {
  recordCaptureIntent: () => Promise<void | boolean | unknown>;
  countdownSequence: readonly number[];
  wait: (ms: number) => Promise<void | unknown>;
  onCountdownChange: (value: number | null) => void;
  captureSquareImage: () => string;
  prepareCapture: () => Promise<TPrepared>;
  onProcessingStart: (prepared: TPrepared) => void;
  processCapture: (payload: { jobId: string; imageBase64: string; mimeType: "image/png" }) => Promise<TResult>;
  onResult: (result: TResult) => void;
  onError: (error: unknown) => void;
}) {
  try {
    await input.recordCaptureIntent();

    for (const value of input.countdownSequence) {
      input.onCountdownChange(value);
      await input.wait(700);
    }

    input.onCountdownChange(null);
    const imageBase64 = input.captureSquareImage();
    const prepared = await input.prepareCapture();
    input.onProcessingStart(prepared);
    const result = await input.processCapture({
      jobId: prepared.jobId,
      imageBase64,
      mimeType: "image/png",
    });
    input.onResult(result);
  } catch (error) {
    input.onCountdownChange(null);
    input.onError(error);
  }
}
