import { pgTable, serial, text, integer, boolean, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod/v4";
import { teamsTable } from "./teams";

export const patientsTable = pgTable("patients", {
  id: serial("id").primaryKey(),
  identification: text("identification").notNull(),
  age: integer("age").notNull(),
  sex: text("sex", { enum: ["masculino", "feminino"] }).notNull(),
  teamId: integer("team_id").notNull().references(() => teamsTable.id),
  microarea: text("microarea").notNull(),
  smokingStatus: text("smoking_status", { enum: ["ativo", "ex-tabagista"] }).notNull(),
  hasOralLesion: boolean("has_oral_lesion").notNull().default(false),
  lesionType: text("lesion_type"),
  diagnosis: text("diagnosis", { enum: ["nenhum", "em_investigacao", "confirmado"] }).notNull().default("nenhum"),
  lastEvaluationDate: date("last_evaluation_date", { mode: "string" }),
  registrationDate: date("registration_date", { mode: "string" }).notNull(),
  notes: text("notes"),
  patientStatus: text("patient_status", { enum: ["ativo", "inativo"] }).notNull().default("ativo"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const patientsRelations = relations(patientsTable, ({ one }) => ({
  team: one(teamsTable, {
    fields: [patientsTable.teamId],
    references: [teamsTable.id],
  }),
}));

export const teamsRelations = relations(teamsTable, ({ many }) => ({
  patients: many(patientsTable),
}));

export const insertPatientSchema = createInsertSchema(patientsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type Patient = typeof patientsTable.$inferSelect;
