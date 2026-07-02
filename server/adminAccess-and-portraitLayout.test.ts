import { describe, expect, it } from "vitest";
import { getAdminAccessState } from "../client/src/lib/adminAccess";
import {
  PORTRAIT_LOGIN_LAYOUT,
  fitsPortraitViewport,
  fitsPortraitViewportWithAdminMenu,
} from "../client/src/lib/portraitLayout";

describe("admin access guard", () => {
  it("keeps the admin screen locked until both server auth and recent unlock are present", () => {
    expect(getAdminAccessState({ serverAuthenticated: false, hasRecentUnlock: false })).toBe("locked");
    expect(getAdminAccessState({ serverAuthenticated: true, hasRecentUnlock: false })).toBe("locked");
    expect(getAdminAccessState({ serverAuthenticated: false, hasRecentUnlock: true })).toBe("locked");
    expect(getAdminAccessState({ serverAuthenticated: true, hasRecentUnlock: true })).toBe("ready");
  });
});

describe("portrait login layout", () => {
  it("keeps the login card and external admin menu inside the target portrait viewport", () => {
    expect(PORTRAIT_LOGIN_LAYOUT.adminMenuBlockHeightPx).toBe(52);
    expect(fitsPortraitViewport()).toBe(true);
    expect(fitsPortraitViewportWithAdminMenu()).toBe(true);
  });
});
