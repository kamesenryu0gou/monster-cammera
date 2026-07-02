import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const boothDailyCounters = mysqlTable("booth_daily_counters", {
  id: int("id").autoincrement().primaryKey(),
  dateKey: varchar("dateKey", { length: 8 }).notNull().unique(),
  lastSequence: int("lastSequence").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const boothJobs = mysqlTable("booth_jobs", {
  id: int("id").autoincrement().primaryKey(),
  jobId: varchar("jobId", { length: 32 }).notNull().unique(),
  dateKey: varchar("dateKey", { length: 8 }).notNull(),
  sequenceNumber: int("sequenceNumber").notNull(),
  displayNumber: varchar("displayNumber", { length: 16 }).notNull(),
  status: mysqlEnum("status", ["prepared", "processing", "completed", "failed"]).notNull().default("prepared"),
  sourceImageKey: text("sourceImageKey"),
  sourceImageUrl: text("sourceImageUrl"),
  generatedImageKey: text("generatedImageKey"),
  generatedImageUrl: text("generatedImageUrl"),
  printLayoutKey: text("printLayoutKey"),
  printLayoutUrl: text("printLayoutUrl"),
  subjectCount: int("subjectCount").default(0).notNull(),
  assignedVariantsJson: text("assignedVariantsJson"),
  promptSummaryJson: text("promptSummaryJson"),
  errorCode: varchar("errorCode", { length: 64 }),
  errorMessage: text("errorMessage"),
  processedAt: timestamp("processedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const boothDevices = mysqlTable("booth_devices", {
  id: int("id").autoincrement().primaryKey(),
  deviceId: varchar("deviceId", { length: 64 }).notNull().unique(),
  firstSeenAt: timestamp("firstSeenAt").defaultNow().notNull(),
  lastSeenAt: timestamp("lastSeenAt").defaultNow().notNull(),
  lastSeenUserAgent: text("lastSeenUserAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const boothCaptureEvents = mysqlTable("booth_capture_events", {
  id: int("id").autoincrement().primaryKey(),
  deviceId: varchar("deviceId", { length: 64 }).notNull(),
  eventType: mysqlEnum("eventType", ["capture_started"]).notNull().default("capture_started"),
  localDateKey: varchar("localDateKey", { length: 10 }).notNull(),
  localHourKey: varchar("localHourKey", { length: 13 }).notNull(),
  jobId: varchar("jobId", { length: 32 }),
  triggeredAt: timestamp("triggeredAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export type BoothDailyCounter = typeof boothDailyCounters.$inferSelect;
export type InsertBoothDailyCounter = typeof boothDailyCounters.$inferInsert;

export type BoothJob = typeof boothJobs.$inferSelect;
export type InsertBoothJob = typeof boothJobs.$inferInsert;

export type BoothDevice = typeof boothDevices.$inferSelect;
export type InsertBoothDevice = typeof boothDevices.$inferInsert;

export type BoothCaptureEvent = typeof boothCaptureEvents.$inferSelect;
export type InsertBoothCaptureEvent = typeof boothCaptureEvents.$inferInsert;
