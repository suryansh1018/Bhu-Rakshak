import { double, int, longtext, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

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

export const signInEvents = mysqlTable("signInEvents", {
  id: int("id").autoincrement().primaryKey(),
  userOpenId: varchar("userOpenId", { length: 64 }).notNull(),
  userName: text("userName"),
  email: varchar("email", { length: 320 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  loginMethod: varchar("loginMethod", { length: 64 }),
  signedInAt: timestamp("signedInAt").defaultNow().notNull(),
});

export const alertSubscriptions = mysqlTable("alertSubscriptions", {
  id: int("id").autoincrement().primaryKey(),
  phone: varchar("phone", { length: 32 }).notNull(),
  corridorId: varchar("corridorId", { length: 32 }).notNull(),
  channel: mysqlEnum("channel", ["whatsapp", "sms"]).default("whatsapp").notNull(),
  consent: int("consent").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const incidentReports = mysqlTable("incidentReports", {
  id: int("id").autoincrement().primaryKey(),
  corridorId: varchar("corridorId", { length: 32 }).notNull(),
  description: longtext("description").notNull(),
  latitude: double("latitude"),
  longitude: double("longitude"),
  imageKey: varchar("imageKey", { length: 512 }),
  imageUrl: varchar("imageUrl", { length: 768 }),
  status: mysqlEnum("status", ["received", "reviewing", "resolved"]).default("received").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const riskSnapshots = mysqlTable("riskSnapshots", {
  id: int("id").autoincrement().primaryKey(),
  corridorId: varchar("corridorId", { length: 32 }).notNull(),
  rainfall24h: double("rainfall24h").notNull(),
  rainfall7d: double("rainfall7d").notNull(),
  riskLevel: mysqlEnum("riskLevel", ["low", "moderate", "high"]).notNull(),
  riskScore: double("riskScore").notNull(),
  factorOfSafety: double("factorOfSafety").notNull(),
  source: varchar("source", { length: 128 }).notNull(),
  measuredAt: timestamp("measuredAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type SignInEvent = typeof signInEvents.$inferSelect;
export type AlertSubscription = typeof alertSubscriptions.$inferSelect;
export type IncidentReport = typeof incidentReports.$inferSelect;
export type RiskSnapshot = typeof riskSnapshots.$inferSelect;
