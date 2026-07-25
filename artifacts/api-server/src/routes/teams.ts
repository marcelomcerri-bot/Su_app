import { Router, type IRouter } from "express";
import { eq, count, sql } from "drizzle-orm";
import { db, teamsTable, patientsTable } from "@workspace/db";
import {
  CreateTeamBody,
  UpdateTeamParams,
  UpdateTeamBody,
  DeleteTeamParams,
  TransferTeamPatientsParams,
  TransferTeamPatientsBody,
} from "@workspace/api-zod";
import { requireAuth, requireAdmin } from "../lib/auth";

const router: IRouter = Router();

router.get("/teams", requireAuth, async (req, res): Promise<void> => {
  const teams = await db
    .select({
      id: teamsTable.id,
      name: teamsTable.name,
      createdAt: teamsTable.createdAt,
      patientCount: count(patientsTable.id),
    })
    .from(teamsTable)
    .leftJoin(patientsTable, eq(patientsTable.teamId, teamsTable.id))
    .groupBy(teamsTable.id)
    .orderBy(teamsTable.name);

  res.json(teams);
});

router.post("/teams", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateTeamBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [team] = await db.insert(teamsTable).values({ name: parsed.data.name }).returning();
  res.status(201).json({ ...team, patientCount: 0 });
});

router.patch("/teams/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateTeamParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateTeamBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [team] = await db
    .update(teamsTable)
    .set({ name: parsed.data.name })
    .where(eq(teamsTable.id, params.data.id))
    .returning();

  if (!team) {
    res.status(404).json({ error: "Equipe não encontrada" });
    return;
  }

  const [{ patientCount }] = await db
    .select({ patientCount: count(patientsTable.id) })
    .from(patientsTable)
    .where(eq(patientsTable.teamId, team.id));

  res.json({ ...team, patientCount });
});

router.delete("/teams/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = DeleteTeamParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, params.data.id));
  if (!team) {
    res.status(404).json({ error: "Equipe não encontrada" });
    return;
  }

  const [{ patientCount }] = await db
    .select({ patientCount: count(patientsTable.id) })
    .from(patientsTable)
    .where(eq(patientsTable.teamId, params.data.id));

  if (patientCount > 0) {
    res.status(400).json({
      error: `Esta equipe possui ${patientCount} paciente(s). Transfira-os para outra equipe antes de excluir.`,
    });
    return;
  }

  await db.delete(teamsTable).where(eq(teamsTable.id, params.data.id));
  res.json({ success: true, message: "Equipe excluída com sucesso" });
});

router.post("/teams/:id/transfer-patients", requireAdmin, async (req, res): Promise<void> => {
  const params = TransferTeamPatientsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = TransferTeamPatientsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [sourceTeam] = await db.select().from(teamsTable).where(eq(teamsTable.id, params.data.id));
  if (!sourceTeam) {
    res.status(404).json({ error: "Equipe de origem não encontrada" });
    return;
  }

  const [targetTeam] = await db.select().from(teamsTable).where(eq(teamsTable.id, parsed.data.targetTeamId));
  if (!targetTeam) {
    res.status(404).json({ error: "Equipe de destino não encontrada" });
    return;
  }

  await db
    .update(patientsTable)
    .set({ teamId: parsed.data.targetTeamId })
    .where(eq(patientsTable.teamId, params.data.id));

  res.json({ success: true, message: "Pacientes transferidos com sucesso" });
});

export default router;
