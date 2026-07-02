import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  completeBoothJob: vi.fn(),
  createPreparedBoothJob: vi.fn(),
  failBoothJob: vi.fn(),
  getBoothHourlyCaptureStats: vi.fn(),
  getBoothJobById: vi.fn(),
  getTodayIsoDateKey: vi.fn(() => "2026-06-26"),
  listBoothCaptureDateKeys: vi.fn(),
  listBoothDevices: vi.fn(),
  listRecentBoothJobs: vi.fn(),
  markBoothJobProcessing: vi.fn(),
  recordBoothCaptureEvent: vi.fn(),
}));

vi.mock("./db", () => dbMocks);

const authModule = await import("./signageAdminAuth");
const { appRouter } = await import("./routers");

function createPublicContext(overrides?: Partial<TrpcContext>): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
      cookies: {},
      get: () => undefined,
      ...overrides?.req,
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
      cookie: vi.fn(),
      ...overrides?.res,
    } as TrpcContext["res"],
  };
}

describe("signage admin analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.listBoothCaptureDateKeys.mockResolvedValue(["2026-06-26"]);
    dbMocks.listBoothDevices.mockResolvedValue([
      { deviceId: "device-alpha" },
      { deviceId: "device-beta" },
    ]);
    dbMocks.getBoothHourlyCaptureStats.mockResolvedValue([
      { deviceId: "device-alpha", localDateKey: "2026-06-26", localHourKey: "2026-06-26 09", captureCount: 2 },
      { deviceId: "device-beta", localDateKey: "2026-06-26", localHourKey: "2026-06-26 10", captureCount: 1 },
    ]);
  });

  it("accepts the configured admin password and stores a signed admin cookie", async () => {
    const context = createPublicContext();
    const caller = appRouter.createCaller(context);

    const result = await caller.signage.adminUnlock({ password: "mf1count" });

    expect(result).toEqual({ success: true });
    expect(context.res.cookie).toHaveBeenCalledOnce();
    const [cookieName, cookieValue] = vi.mocked(context.res.cookie).mock.calls[0] ?? [];
    expect(cookieName).toBe(authModule.SIGNAGE_ADMIN_COOKIE_NAME);
    expect(typeof cookieValue).toBe("string");
    expect(authModule.verifySignageAdminSessionToken(cookieValue)).toBe(true);
  });

  it("rejects hourly stats requests when the admin session cookie is missing", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.signage.getAdminHourlyStats({})).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("returns device totals and hourly rows when the admin session is valid", async () => {
    const token = authModule.createSignageAdminSessionToken();
    const caller = appRouter.createCaller(
      createPublicContext({
        req: {
          cookies: {
            [authModule.SIGNAGE_ADMIN_COOKIE_NAME]: token,
          },
        } as TrpcContext["req"],
      }),
    );

    const result = await caller.signage.getAdminHourlyStats({ dateKey: "2026-06-26" });

    expect(dbMocks.getBoothHourlyCaptureStats).toHaveBeenCalledWith({ dateKey: "2026-06-26" });
    expect(result.selectedDateKey).toBe("2026-06-26");
    expect(result.devices).toEqual([
      { deviceId: "device-alpha", totalCaptures: 2 },
      { deviceId: "device-beta", totalCaptures: 1 },
    ]);
    expect(result.hourlyRows).toEqual([
      {
        deviceId: "device-alpha",
        localDateKey: "2026-06-26",
        localHourKey: "2026-06-26 09",
        hourLabel: "09:00",
        captureCount: 2,
      },
      {
        deviceId: "device-beta",
        localDateKey: "2026-06-26",
        localHourKey: "2026-06-26 10",
        hourLabel: "10:00",
        captureCount: 1,
      },
    ]);
  });

  it("recognizes the admin session from the raw cookie header when request cookies are not pre-parsed", async () => {
    const token = authModule.createSignageAdminSessionToken();
    const caller = appRouter.createCaller(
      createPublicContext({
        req: {
          headers: {
            cookie: `${authModule.SIGNAGE_ADMIN_COOKIE_NAME}=${encodeURIComponent(token)}`,
          },
          cookies: undefined,
        } as TrpcContext["req"],
      }),
    );

    await expect(caller.signage.adminStatus()).resolves.toEqual({ authenticated: true });
    await expect(caller.signage.getAdminHourlyStats({ dateKey: "2026-06-26" })).resolves.toMatchObject({
      selectedDateKey: "2026-06-26",
    });
  });
});
