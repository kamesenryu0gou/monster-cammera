import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const adminPageSource = readFileSync(new URL("../client/src/pages/AdminPage.tsx", import.meta.url), "utf8");

describe("admin page analytics guardrails", () => {
  it("renders loading, error, and empty states for hourly analytics", () => {
    expect(adminPageSource).toContain("集計データを読み込んでいます...");
    expect(adminPageSource).toContain("集計データの読み込みに失敗しました。時間をおいて再度お試しください。");
    expect(adminPageSource).toContain("まだ撮影開始データがありません。最初の撮影後に、この画面へ端末別の1時間集計が表示されます。");
  });

  it("keeps the dedicated admin route actions, re-authentication guard, and hourly table labels", () => {
    expect(adminPageSource).toContain('setLocation("/")');
    expect(adminPageSource).toContain("管理者メニュー");
    expect(adminPageSource).toContain("管理者ログイン");
    expect(adminPageSource).toContain("時間帯");
    expect(adminPageSource).toContain("端末ID");
    expect(adminPageSource).toContain("const HOUR_LABELS = Array.from({ length: 24 }");
    expect(adminPageSource).toContain('const ADMIN_UNLOCK_SESSION_KEY = "signage-admin-unlocked"');
    expect(adminPageSource).toContain('window.sessionStorage.setItem(ADMIN_UNLOCK_SESSION_KEY, "true")');
    expect(adminPageSource).toContain('window.sessionStorage.removeItem(ADMIN_UNLOCK_SESSION_KEY)');
    expect(adminPageSource).toContain('window.sessionStorage.getItem(ADMIN_UNLOCK_SESSION_KEY) === "true"');
    expect(adminPageSource).toContain('getAdminAccessState({');
    expect(adminPageSource).toContain('hasRecentUnlock,');
    expect(adminPageSource).toContain('}) === "ready";');
  });
});
