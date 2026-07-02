import type { getDeviceLocalTimeKeys } from "./boothDeviceId";

type CaptureIntentInput = {
  deviceId: string;
  timeKeys: ReturnType<typeof getDeviceLocalTimeKeys>;
};

type CaptureIntentMutation = {
  mutateAsync: (input: {
    deviceId: string;
    localDateKey: string;
    localHourKey: string;
  }) => Promise<unknown>;
};

export async function recordCaptureIntentSafely(
  mutation: CaptureIntentMutation,
  input: CaptureIntentInput,
  logger: (message: string, error: unknown) => void = console.warn,
) {
  try {
    await mutation.mutateAsync({
      deviceId: input.deviceId,
      localDateKey: input.timeKeys.localDateKey,
      localHourKey: input.timeKeys.localHourKey,
    });
    return true;
  } catch (error) {
    logger("[Analytics] Failed to record capture intent", error);
    return false;
  }
}
