export type AdminAnalyticsViewState = "loading" | "error" | "empty" | "ready";

export function getAdminAnalyticsViewState(input: {
  isLoading: boolean;
  hasError: boolean;
  deviceCount: number;
}) {
  if (input.isLoading) {
    return "loading" satisfies AdminAnalyticsViewState;
  }
  if (input.hasError) {
    return "error" satisfies AdminAnalyticsViewState;
  }
  if (input.deviceCount === 0) {
    return "empty" satisfies AdminAnalyticsViewState;
  }
  return "ready" satisfies AdminAnalyticsViewState;
}
