export const PORTRAIT_LOGIN_LAYOUT = {
  targetViewportWidthPx: 1080,
  targetViewportHeightPx: 1920,
  reservedViewportChromePx: 210,
  adminMenuBlockHeightPx: 52,
  cardMaxHeightPx: 1510,
} as const;

export function fitsPortraitViewport() {
  return PORTRAIT_LOGIN_LAYOUT.cardMaxHeightPx + PORTRAIT_LOGIN_LAYOUT.reservedViewportChromePx <= PORTRAIT_LOGIN_LAYOUT.targetViewportHeightPx;
}

export function fitsPortraitViewportWithAdminMenu() {
  return (
    PORTRAIT_LOGIN_LAYOUT.cardMaxHeightPx +
      PORTRAIT_LOGIN_LAYOUT.adminMenuBlockHeightPx +
      PORTRAIT_LOGIN_LAYOUT.reservedViewportChromePx <=
    PORTRAIT_LOGIN_LAYOUT.targetViewportHeightPx
  );
}
