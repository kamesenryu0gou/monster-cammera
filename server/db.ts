import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  boothCaptureEvents,
  boothDailyCounters,
  boothDevices,
  boothJobs,
  InsertUser,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

function requireDb<T>(db: T | null): T {
  if (!db) {
    throw new Error("DATABASE_UNAVAILABLE");
  }
  return db;
}

function padDisplayNumber(sequenceNumber: number) {
  return String(sequenceNumber).padStart(4, "0");
}

export function getTodayDateKey(now = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(now);
  const year = parts.find(part => part.type === "year")?.value ?? "0000";
  const month = parts.find(part => part.type === "month")?.value ?? "00";
  const day = parts.find(part => part.type === "day")?.value ?? "00";
  return `${year}${month}${day}`;
}

export function getTodayIsoDateKey(now = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(now);
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function nextReceptionNumber(now = new Date()) {
  const db = requireDb(await getDb());
  const dateKey = getTodayDateKey(now);

  await db.execute(sql`
    INSERT INTO booth_daily_counters (dateKey, lastSequence)
    VALUES (${dateKey}, 1)
    ON DUPLICATE KEY UPDATE lastSequence = lastSequence + 1, updatedAt = CURRENT_TIMESTAMP
  `);

  const rows = await db
    .select()
    .from(boothDailyCounters)
    .where(eq(boothDailyCounters.dateKey, dateKey))
    .limit(1);

  const counter = rows[0];
  if (!counter) {
    throw new Error("COUNTER_NOT_CREATED");
  }

  return {
    dateKey,
    sequenceNumber: counter.lastSequence,
    displayNumber: padDisplayNumber(counter.lastSequence),
    jobId: `${dateKey}-${padDisplayNumber(counter.lastSequence)}`,
  };
}

export async function createPreparedBoothJob() {
  const db = requireDb(await getDb());
  const reception = await nextReceptionNumber();

  await db.insert(boothJobs).values({
    jobId: reception.jobId,
    dateKey: reception.dateKey,
    sequenceNumber: reception.sequenceNumber,
    displayNumber: reception.displayNumber,
    status: "prepared",
  });

  return reception;
}

export async function markBoothJobProcessing(jobId: string, sourceImage: { key: string; url: string }) {
  const db = requireDb(await getDb());
  await db
    .update(boothJobs)
    .set({
      status: "processing",
      sourceImageKey: sourceImage.key,
      sourceImageUrl: sourceImage.url,
      errorCode: null,
      errorMessage: null,
    })
    .where(eq(boothJobs.jobId, jobId));
}

export async function completeBoothJob(input: {
  jobId: string;
  generatedImage: { key: string; url: string };
  printLayout: { key: string; url: string };
  subjectCount: number;
  assignedVariantsJson: string;
  promptSummaryJson: string;
}) {
  const db = requireDb(await getDb());
  await db
    .update(boothJobs)
    .set({
      status: "completed",
      generatedImageKey: input.generatedImage.key,
      generatedImageUrl: input.generatedImage.url,
      printLayoutKey: input.printLayout.key,
      printLayoutUrl: input.printLayout.url,
      subjectCount: input.subjectCount,
      assignedVariantsJson: input.assignedVariantsJson,
      promptSummaryJson: input.promptSummaryJson,
      processedAt: new Date(),
      errorCode: null,
      errorMessage: null,
    })
    .where(eq(boothJobs.jobId, input.jobId));
}

export async function failBoothJob(jobId: string, errorCode: string, errorMessage: string) {
  const db = requireDb(await getDb());
  await db
    .update(boothJobs)
    .set({
      status: "failed",
      errorCode,
      errorMessage,
      processedAt: new Date(),
    })
    .where(eq(boothJobs.jobId, jobId));
}

export async function getBoothJobById(jobId: string) {
  const db = requireDb(await getDb());
  const rows = await db.select().from(boothJobs).where(eq(boothJobs.jobId, jobId)).limit(1);
  return rows[0] ?? null;
}

export async function listRecentBoothJobs(limit = 8) {
  const db = requireDb(await getDb());
  return db.select().from(boothJobs).orderBy(desc(boothJobs.id)).limit(limit);
}

export async function registerBoothDevice(input: { deviceId: string; userAgent?: string | null }) {
  const db = requireDb(await getDb());
  const now = new Date();
  await db.insert(boothDevices).values({
    deviceId: input.deviceId,
    firstSeenAt: now,
    lastSeenAt: now,
    lastSeenUserAgent: input.userAgent ?? null,
  }).onDuplicateKeyUpdate({
    set: {
      lastSeenAt: now,
      lastSeenUserAgent: input.userAgent ?? null,
    },
  });
}

export async function recordBoothCaptureEvent(input: {
  deviceId: string;
  localDateKey: string;
  localHourKey: string;
  jobId?: string | null;
  triggeredAt?: Date;
  userAgent?: string | null;
}) {
  const db = requireDb(await getDb());
  await registerBoothDevice({ deviceId: input.deviceId, userAgent: input.userAgent });
  await db.insert(boothCaptureEvents).values({
    deviceId: input.deviceId,
    eventType: "capture_started",
    localDateKey: input.localDateKey,
    localHourKey: input.localHourKey,
    jobId: input.jobId ?? null,
    triggeredAt: input.triggeredAt ?? new Date(),
  });
}

export async function listBoothCaptureDateKeys(limit = 31) {
  const db = requireDb(await getDb());
  const rows = await db.selectDistinct({ localDateKey: boothCaptureEvents.localDateKey })
    .from(boothCaptureEvents)
    .orderBy(desc(boothCaptureEvents.localDateKey))
    .limit(limit);
  return rows.map(row => row.localDateKey);
}

export async function getBoothHourlyCaptureStats(input: { dateKey: string }) {
  const db = requireDb(await getDb());
  const rows = await db
    .select({
      deviceId: boothCaptureEvents.deviceId,
      localDateKey: boothCaptureEvents.localDateKey,
      localHourKey: boothCaptureEvents.localHourKey,
      captureCount: sql<number>`count(*)`,
    })
    .from(boothCaptureEvents)
    .where(eq(boothCaptureEvents.localDateKey, input.dateKey))
    .groupBy(boothCaptureEvents.deviceId, boothCaptureEvents.localDateKey, boothCaptureEvents.localHourKey)
    .orderBy(boothCaptureEvents.deviceId, boothCaptureEvents.localHourKey);

  return rows.map(row => ({
    deviceId: row.deviceId,
    localDateKey: row.localDateKey,
    localHourKey: row.localHourKey,
    captureCount: Number(row.captureCount),
  }));
}

export async function listBoothDevices() {
  const db = requireDb(await getDb());
  return db.select().from(boothDevices).orderBy(desc(boothDevices.lastSeenAt));
}
