import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  name: text("name"),
  role: text("role", { enum: ["member", "admin"] }).notNull().default("member"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  lastSeenAt: text("last_seen_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, table => [uniqueIndex("users_email_unique").on(table.email)]);

export const accessRules = sqliteTable("access_rules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  kind: text("kind", { enum: ["email", "domain"] }).notNull(),
  value: text("value").notNull(),
  createdBy: text("created_by").references(() => users.id),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, table => [uniqueIndex("access_rule_unique").on(table.kind, table.value)]);

export const passwordRecipes = sqliteTable("password_recipes", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  recipeJson: text("recipe_json").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, table => [index("recipes_user_idx").on(table.userId)]);

export const assets = sqliteTable("assets", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  kind: text("kind", { enum: ["domain", "ip"] }).notNull(),
  target: text("target").notNull(),
  label: text("label"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, table => [index("assets_user_idx").on(table.userId)]);

export const monitors = sqliteTable("monitors", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tool: text("tool").notNull(),
  target: text("target").notNull(),
  configJson: text("config_json").notNull().default("{}"),
  expectedJson: text("expected_json").notNull().default("{}"),
  intervalMinutes: integer("interval_minutes").notNull().default(15),
  status: text("status", { enum: ["active", "paused"] }).notNull().default("active"),
  lastRunAt: text("last_run_at"),
  nextRunAt: text("next_run_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, table => [index("monitors_due_idx").on(table.status, table.nextRunAt), index("monitors_user_idx").on(table.userId)]);

export const monitorRuns = sqliteTable("monitor_runs", {
  id: text("id").primaryKey(),
  monitorId: text("monitor_id").notNull().references(() => monitors.id, { onDelete: "cascade" }),
  idempotencyKey: text("idempotency_key").notNull(),
  outcome: text("outcome", { enum: ["healthy", "warning", "error"] }).notNull(),
  resultJson: text("result_json").notNull(),
  durationMs: integer("duration_ms").notNull(),
  checkedAt: text("checked_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, table => [uniqueIndex("monitor_runs_idempotency_unique").on(table.idempotencyKey), index("monitor_runs_retention_idx").on(table.checkedAt)]);

export const incidents = sqliteTable("incidents", {
  id: text("id").primaryKey(),
  monitorId: text("monitor_id").notNull().references(() => monitors.id, { onDelete: "cascade" }),
  state: text("state", { enum: ["open", "resolved"] }).notNull().default("open"),
  summary: text("summary").notNull(),
  openedAt: text("opened_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  resolvedAt: text("resolved_at"),
  lastAlertedAt: text("last_alerted_at"),
}, table => [index("incidents_monitor_idx").on(table.monitorId, table.state)]);

export const notificationChannels = sqliteTable("notification_channels", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  kind: text("kind", { enum: ["email", "webhook"] }).notNull(),
  label: text("label").notNull(),
  destinationEncrypted: text("destination_encrypted").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, table => [index("notifications_user_idx").on(table.userId)]);
