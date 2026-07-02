export type AdminAccessState = "locked" | "ready";

export function getAdminAccessState({
  serverAuthenticated,
  hasRecentUnlock,
}: {
  serverAuthenticated: boolean;
  hasRecentUnlock: boolean;
}): AdminAccessState {
  return serverAuthenticated && hasRecentUnlock ? "ready" : "locked";
}
