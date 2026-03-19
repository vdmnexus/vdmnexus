import { pgTable, text, timestamp, integer, jsonb, boolean, real } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Waitlist ────────────────────────────────────────────

export const waitlist = pgTable("waitlist", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull().unique(),
  company: text("company"),
  useCase: text("use_case"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Users / Tenants ─────────────────────────────────────

export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull().unique(),
  name: text("name"),
  passwordHash: text("password_hash"),
  plan: text("plan").default("starter").notNull(), // starter, growth, scale
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Employees ───────────────────────────────────────────

export const employees = pgTable("employees", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  role: text("role"), // e.g. "Vastgoedbeheer", "Klantenservice"
  avatar: text("avatar"), // letter or URL
  model: text("model").default("claude-sonnet-4").notNull(),
  memoryMode: text("memory_mode").default("persistent").notNull(),
  soulMemory: text("soul_memory"), // the personality/instructions text
  personality: jsonb("personality").$type<{
    tone: number;       // 0=formeel, 100=informeel
    proactivity: number; // 0=reactief, 100=proactief
    autonomy: number;    // 0=vraagt altijd, 100=autonoom
  }>(),
  languages: jsonb("languages").$type<string[]>().default(["nl"]),
  channels: jsonb("channels").$type<string[]>().default(["dashboard"]),
  guardrails: jsonb("guardrails").$type<string[]>(),
  active: boolean("active").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const employeesRelations = relations(employees, ({ one, many }) => ({
  user: one(users, { fields: [employees.userId], references: [users.id] }),
  skills: many(employeeSkills),
  knowledgeFiles: many(knowledgeFiles),
  conversations: many(conversations),
}));

// ─── Skills ──────────────────────────────────────────────

export const skills = pgTable("skills", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").references(() => users.id), // null = pre-built
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").default("pre-built").notNull(), // pre-built, custom
  config: jsonb("config"), // triggers, actions, conditions
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const employeeSkills = pgTable("employee_skills", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  employeeId: text("employee_id").notNull().references(() => employees.id),
  skillId: text("skill_id").notNull().references(() => skills.id),
  enabled: boolean("enabled").default(true).notNull(),
});

export const employeeSkillsRelations = relations(employeeSkills, ({ one }) => ({
  employee: one(employees, { fields: [employeeSkills.employeeId], references: [employees.id] }),
  skill: one(skills, { fields: [employeeSkills.skillId], references: [skills.id] }),
}));

// ─── Knowledge Base ──────────────────────────────────────

export const knowledgeFiles = pgTable("knowledge_files", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  employeeId: text("employee_id").notNull().references(() => employees.id),
  filename: text("filename").notNull(),
  mimeType: text("mime_type"),
  sizeBytes: integer("size_bytes"),
  storagePath: text("storage_path"), // local path or S3 key
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const knowledgeFilesRelations = relations(knowledgeFiles, ({ one }) => ({
  employee: one(employees, { fields: [knowledgeFiles.employeeId], references: [employees.id] }),
}));

// ─── Conversations ───────────────────────────────────────

export const conversations = pgTable("conversations", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  employeeId: text("employee_id").notNull().references(() => employees.id),
  channel: text("channel").default("dashboard").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  conversationId: text("conversation_id").notNull().references(() => conversations.id),
  role: text("role").notNull(), // user, assistant
  content: text("content").notNull(),
  tokensIn: integer("tokens_in"),
  tokensOut: integer("tokens_out"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  employee: one(employees, { fields: [conversations.employeeId], references: [employees.id] }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, { fields: [messages.conversationId], references: [conversations.id] }),
}));
