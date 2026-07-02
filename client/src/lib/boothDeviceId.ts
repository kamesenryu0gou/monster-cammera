const BOOTH_DEVICE_ID_KEY = "ai-photobooth-device-id";

function createDeviceId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `device-${crypto.randomUUID()}`;
  }
  return `device-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export function getBoothDeviceId() {
  if (typeof window === "undefined") {
    return "device-server-render";
  }

  const existing = window.localStorage.getItem(BOOTH_DEVICE_ID_KEY);
  if (existing) {
    return existing;
  }

  const next = createDeviceId();
  window.localStorage.setItem(BOOTH_DEVICE_ID_KEY, next);
  return next;
}

export function getDeviceLocalTimeKeys(now = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const year = parts.find(part => part.type === "year")?.value ?? "0000";
  const month = parts.find(part => part.type === "month")?.value ?? "00";
  const day = parts.find(part => part.type === "day")?.value ?? "00";
  const hour = parts.find(part => part.type === "hour")?.value ?? "00";
  const localDateKey = `${year}-${month}-${day}`;
  return {
    localDateKey,
    localHourKey: `${localDateKey} ${hour}`,
  };
}
