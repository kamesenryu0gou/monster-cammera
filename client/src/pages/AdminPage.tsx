import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { getAdminAccessState } from "@/lib/adminAccess";
import { getAdminAnalyticsViewState } from "@/lib/adminAnalyticsView";
import { trpc } from "@/lib/trpc";

const HOUR_LABELS = Array.from({ length: 24 }, (_, index) => `${String(index).padStart(2, "0")}:00`);
const ADMIN_UNLOCK_SESSION_KEY = "signage-admin-unlocked";

export default function AdminPage() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const adminStatusQuery = trpc.signage.adminStatus.useQuery();
  const [hasRecentUnlock, setHasRecentUnlock] = useState(false);
  const adminUnlockMutation = trpc.signage.adminUnlock.useMutation({
    onSuccess: async () => {
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(ADMIN_UNLOCK_SESSION_KEY, "true");
      }
      setHasRecentUnlock(true);
      await utils.signage.adminStatus.invalidate();
      await adminStatusQuery.refetch();
    },
  });
  const adminLogoutMutation = trpc.signage.adminLogout.useMutation({
    onSuccess: async () => {
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(ADMIN_UNLOCK_SESSION_KEY);
      }
      setHasRecentUnlock(false);
      await utils.signage.adminStatus.invalidate();
      await utils.signage.getAdminHourlyStats.invalidate();
    },
  });

  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [selectedDateKey, setSelectedDateKey] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setHasRecentUnlock(window.sessionStorage.getItem(ADMIN_UNLOCK_SESSION_KEY) === "true");
  }, []);

  const isAuthenticated =
    getAdminAccessState({
      serverAuthenticated: adminStatusQuery.data?.authenticated ?? false,
      hasRecentUnlock,
    }) === "ready";
  const adminStatsQuery = trpc.signage.getAdminHourlyStats.useQuery(
    { dateKey: selectedDateKey || undefined },
    { enabled: isAuthenticated },
  );

  useEffect(() => {
    if (!selectedDateKey && adminStatsQuery.data?.selectedDateKey) {
      setSelectedDateKey(adminStatsQuery.data.selectedDateKey);
    }
  }, [adminStatsQuery.data?.selectedDateKey, selectedDateKey]);

  const countsByDeviceAndHour = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of adminStatsQuery.data?.hourlyRows ?? []) {
      map.set(`${row.deviceId}:${row.hourLabel}`, row.captureCount);
    }
    return map;
  }, [adminStatsQuery.data?.hourlyRows]);

  const deviceSummaries = adminStatsQuery.data?.devices ?? [];
  const analyticsViewState = getAdminAnalyticsViewState({
    isLoading: adminStatsQuery.isLoading,
    hasError: Boolean(adminStatsQuery.error),
    deviceCount: deviceSummaries.length,
  });

  const handleAdminLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError("");

    if (!password.trim()) {
      setLoginError("管理者パスワードを入力してください。");
      return;
    }

    try {
      await adminUnlockMutation.mutateAsync({ password });
      setPassword("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "管理者パスワードが正しくありません。";
      setLoginError(message);
    }
  };

  const handleLogout = async () => {
    await adminLogoutMutation.mutateAsync();
    setSelectedDateKey("");
    setPassword("");
    setLocation("/");
  };

  return (
    <section className="relative min-h-[100svh] overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.16),_transparent_24%),radial-gradient(circle_at_bottom,_rgba(236,72,153,0.12),_transparent_28%),linear-gradient(180deg,_#ffffff_0%,_#fff8fb_54%,_#ffffff_100%)] px-3 py-4 sm:px-5 sm:py-5">
      <div className="mx-auto flex min-h-[calc(100svh-2rem)] w-full max-w-[min(94vw,1080px)] flex-col rounded-[1.8rem] border border-[#d9e0ea] bg-white/96 px-4 py-4 shadow-[0_22px_60px_rgba(148,163,184,0.22)] sm:px-5 sm:py-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e2e8f0] pb-4">
          <div>
            <p className="text-[clamp(1.05rem,2.2vw,1.4rem)] font-black tracking-[0.12em] text-slate-900">管理者メニュー</p>
            <p className="mt-1 text-sm font-semibold text-slate-600">端末ごとの撮影開始回数を、日付別・1時間単位で確認できます。</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => setLocation("/")} className="rounded-[1rem] border border-[#cbd5e1] bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">
              ログイン画面へ戻る
            </Button>
            {isAuthenticated ? (
              <Button type="button" onClick={handleLogout} className="rounded-[1rem] border border-[#0f172a] bg-[linear-gradient(180deg,#facc15_0%,#f59e0b_100%)] px-4 py-2 text-sm font-black text-[#3f2200] hover:bg-[linear-gradient(180deg,#fde047_0%,#fbbf24_100%)]">
                ログアウト
              </Button>
            ) : null}
          </div>
        </div>

        {!isAuthenticated ? (
          <div className="flex flex-1 items-center justify-center py-6">
            <form onSubmit={handleAdminLogin} className="w-full max-w-[420px] rounded-[1.5rem] border border-[#d9e0ea] bg-[#ffffff] px-4 py-4 shadow-[0_16px_34px_rgba(148,163,184,0.16)] sm:px-5 sm:py-5">
              <div className="space-y-2 text-center">
                <p className="text-sm font-black tracking-[0.14em] text-slate-900">ADMIN LOGIN</p>
                <p className="text-xs font-semibold leading-5 text-slate-600 sm:text-sm">管理者パスワードを入力すると、端末別の時間帯集計を表示します。</p>
              </div>
              <div className="mt-4 space-y-3">
                <label htmlFor="admin-password" className="text-xs font-black tracking-[0.14em] text-slate-900 sm:text-sm">
                  PASSWORD
                </label>
                <input
                  id="admin-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={event => {
                    setPassword(event.target.value);
                    if (loginError) {
                      setLoginError("");
                    }
                  }}
                  className="h-13 w-full rounded-[1.1rem] border border-[#cbd5e1] bg-[#f8fafc] px-4 text-base font-black tracking-[0.08em] text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#f59e0b] sm:h-14"
                  placeholder="管理者パスワード"
                />
                {loginError ? (
                  <div className="rounded-[1rem] border border-[#fecaca] bg-[#fff1f2] px-4 py-2.5 text-xs font-bold leading-5 text-[#be123c] sm:text-sm sm:leading-6">
                    {loginError}
                  </div>
                ) : (
                  <div className="rounded-[1rem] border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2 text-[11px] font-semibold leading-4 text-slate-600 sm:text-xs sm:leading-5">
                    パスワード認証後、このブラウザで管理者集計ページを確認できます。
                  </div>
                )}
              </div>
              <Button type="submit" disabled={adminUnlockMutation.isPending} className="mt-4 h-12 w-full rounded-[1.2rem] border border-[#0f172a] bg-[linear-gradient(180deg,#facc15_0%,#f59e0b_100%)] text-sm font-black tracking-[0.12em] text-[#3f2200] shadow-[0_12px_26px_rgba(245,158,11,0.26)] hover:bg-[linear-gradient(180deg,#fde047_0%,#fbbf24_100%)] disabled:opacity-60 sm:h-13 sm:text-base">
                {adminUnlockMutation.isPending ? "認証中..." : "管理者ログイン"}
              </Button>
            </form>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-4 pt-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-black tracking-[0.14em] text-slate-900 sm:text-sm">集計対象日</p>
                <p className="mt-1 text-xs font-semibold text-slate-500 sm:text-sm">1時間ごとの撮影開始回数を端末別に表示します。</p>
              </div>
              <select
                value={selectedDateKey}
                onChange={event => setSelectedDateKey(event.target.value)}
                className="h-11 min-w-[180px] rounded-[1rem] border border-[#cbd5e1] bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-[#f59e0b]"
              >
                {(adminStatsQuery.data?.availableDateKeys ?? []).map(dateKey => (
                  <option key={dateKey} value={dateKey}>
                    {dateKey}
                  </option>
                ))}
              </select>
            </div>

            {analyticsViewState === "loading" ? (
              <div className="flex min-h-[280px] items-center justify-center rounded-[1.35rem] border border-dashed border-[#d9e0ea] bg-[#f8fafc] px-6 text-center text-sm font-bold leading-7 text-slate-600">
                集計データを読み込んでいます...
              </div>
            ) : analyticsViewState === "error" ? (
              <div className="flex min-h-[280px] items-center justify-center rounded-[1.35rem] border border-[#fecaca] bg-[#fff1f2] px-6 text-center text-sm font-bold leading-7 text-[#be123c]">
                集計データの読み込みに失敗しました。時間をおいて再度お試しください。
              </div>
            ) : analyticsViewState === "empty" ? (
              <div className="flex min-h-[280px] items-center justify-center rounded-[1.35rem] border border-dashed border-[#d9e0ea] bg-[#f8fafc] px-6 text-center text-sm font-bold leading-7 text-slate-600">
                まだ撮影開始データがありません。最初の撮影後に、この画面へ端末別の1時間集計が表示されます。
              </div>
            ) : (
              <>
                <div className="grid gap-3 md:grid-cols-3">
                  {deviceSummaries.map(device => (
                    <div key={device.deviceId} className="rounded-[1.25rem] border border-[#d9e0ea] bg-[#f8fafc] px-4 py-3 shadow-[0_10px_22px_rgba(148,163,184,0.12)]">
                      <p className="text-[11px] font-black tracking-[0.14em] text-slate-500">端末ID</p>
                      <p className="mt-1 break-all text-sm font-black text-slate-900">{device.deviceId}</p>
                      <p className="mt-3 text-2xl font-black tracking-[0.08em] text-[#c2410c]">{device.totalCaptures}回</p>
                    </div>
                  ))}
                </div>

                <div className="min-h-0 flex-1 overflow-auto rounded-[1.35rem] border border-[#d9e0ea] bg-white shadow-[0_14px_30px_rgba(148,163,184,0.12)]">
                  <table className="min-w-full border-collapse text-sm">
                    <thead className="sticky top-0 bg-[#fff7ed]">
                      <tr>
                        <th className="border-b border-[#fed7aa] px-3 py-3 text-left text-xs font-black tracking-[0.14em] text-slate-700">時間帯</th>
                        {deviceSummaries.map(device => (
                          <th key={device.deviceId} className="border-b border-[#fed7aa] px-3 py-3 text-left text-xs font-black tracking-[0.08em] text-slate-700">
                            {device.deviceId}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {HOUR_LABELS.map(hourLabel => (
                        <tr key={hourLabel} className="odd:bg-white even:bg-[#fffdfa]">
                          <td className="border-b border-[#f1f5f9] px-3 py-3 font-black text-slate-700">{hourLabel}</td>
                          {deviceSummaries.map(device => (
                            <td key={`${device.deviceId}-${hourLabel}`} className="border-b border-[#f1f5f9] px-3 py-3 text-slate-600">
                              <span className="inline-flex min-w-[3rem] justify-center rounded-full bg-[#fff7ed] px-2.5 py-1 font-black text-[#c2410c]">
                                {countsByDeviceAndHour.get(`${device.deviceId}:${hourLabel}`) ?? 0}
                              </span>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
