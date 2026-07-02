// @vitest-environment jsdom
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminPage from "../client/src/pages/AdminPage";

const setLocationMock = vi.fn();
const invalidateAdminStatusMock = vi.fn(async () => undefined);
const invalidateHourlyStatsMock = vi.fn(async () => undefined);
const refetchAdminStatusMock = vi.fn(async () => ({ data: { authenticated: adminStatusAuthenticated } }));
const adminUnlockMock = vi.fn(async ({ password }: { password: string }) => {
  if (password !== "mf1count") {
    throw new Error("管理者パスワードが正しくありません。");
  }
  adminStatusAuthenticated = true;
});
const adminLogoutMock = vi.fn(async () => {
  adminStatusAuthenticated = false;
});

let adminStatusAuthenticated = false;

vi.mock("wouter", () => ({
  useLocation: () => ["/admin", setLocationMock] as const,
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      signage: {
        adminStatus: { invalidate: invalidateAdminStatusMock },
        getAdminHourlyStats: { invalidate: invalidateHourlyStatsMock },
      },
    }),
    signage: {
      adminStatus: {
        useQuery: () => ({
          data: { authenticated: adminStatusAuthenticated },
          isLoading: false,
          refetch: refetchAdminStatusMock,
        }),
      },
      adminUnlock: {
        useMutation: ({ onSuccess }: { onSuccess?: () => Promise<void> }) => ({
          isPending: false,
          mutateAsync: async (input: { password: string }) => {
            await adminUnlockMock(input);
            await onSuccess?.();
          },
        }),
      },
      adminLogout: {
        useMutation: ({ onSuccess }: { onSuccess?: () => Promise<void> }) => ({
          isPending: false,
          mutateAsync: async () => {
            await adminLogoutMock();
            await onSuccess?.();
          },
        }),
      },
      getAdminHourlyStats: {
        useQuery: (_input: { dateKey?: string }, options?: { enabled?: boolean }) => {
          if (!options?.enabled) {
            return {
              data: undefined,
              isLoading: false,
              error: null,
            };
          }

          return {
            data: {
              selectedDateKey: "2026-06-26",
              availableDateKeys: ["2026-06-26"],
              devices: [{ deviceId: "device-auto-1", totalCaptures: 3 }],
              hourlyRows: [{ deviceId: "device-auto-1", hourLabel: "10:00", captureCount: 3 }],
            },
            isLoading: false,
            error: null,
          };
        },
      },
    },
  },
}));

describe("AdminPage re-authentication guard", () => {
  beforeEach(() => {
    adminStatusAuthenticated = false;
    window.sessionStorage.clear();
    setLocationMock.mockReset();
    invalidateAdminStatusMock.mockClear();
    invalidateHourlyStatsMock.mockClear();
    refetchAdminStatusMock.mockClear();
    adminUnlockMock.mockClear();
    adminLogoutMock.mockClear();
  });

  it("shows the login form when the page opens and keeps analytics hidden without sessionStorage unlock", () => {
    adminStatusAuthenticated = true;

    render(<AdminPage />);

    expect(screen.getByText("ADMIN LOGIN")).toBeTruthy();
    expect(screen.getByPlaceholderText("管理者パスワード")).toBeTruthy();
    expect(screen.queryByText("時間帯")).toBeNull();
    expect(screen.queryByText("device-auto-1")).toBeNull();
  });

  it("shows analytics only after mf1count is entered and the unlock flag is stored", async () => {
    const user = userEvent.setup();
    render(<AdminPage />);

    await user.type(screen.getAllByPlaceholderText("管理者パスワード")[0], "mf1count");
    await user.click(screen.getAllByRole("button", { name: "管理者ログイン" })[0]);

    await waitFor(() => {
      expect(adminUnlockMock).toHaveBeenCalledWith({ password: "mf1count" });
      expect(window.sessionStorage.getItem("signage-admin-unlocked")).toBe("true");
      expect(screen.getByText("時間帯")).toBeTruthy();
      expect(screen.getAllByText("device-auto-1").length).toBeGreaterThan(0);
    });
  });
});
