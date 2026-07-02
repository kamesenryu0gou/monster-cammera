import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getMonthlyPassword } from "./boothLogic";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => undefined,
    } as TrpcContext["res"],
  };
}

describe("signage.unlock", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("accepts the configured monthly password after trimming and width normalization", async () => {
    vi.setSystemTime(new Date("2026-06-16T14:42:58+09:00"));
    const caller = appRouter.createCaller(createPublicContext());
    const monthlyPassword = getMonthlyPassword();
    const fullWidthPassword = monthlyPassword.replace(/\d/g, digit => String.fromCharCode(digit.charCodeAt(0) + 0xFEE0));
    const result = await caller.signage.unlock({ password: ` ${fullWidthPassword} ` });
    expect(monthlyPassword).toBe("24698");
    expect(result).toEqual({ success: true });
  });

  it("switches passwords by Japan time at month boundaries", async () => {
    const caller = appRouter.createCaller(createPublicContext());

    vi.setSystemTime(new Date("2026-05-31T23:59:59+09:00"));
    await expect(caller.signage.unlock({ password: "79031" })).resolves.toEqual({ success: true });

    vi.setSystemTime(new Date("2026-06-01T00:00:00+09:00"));
    await expect(caller.signage.unlock({ password: "24698" })).resolves.toEqual({ success: true });
  });

  it("allows bypass in web preview mode", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.signage.unlock({ password: "", previewBypass: true });
    expect(result).toEqual({ success: true });
  });
});
