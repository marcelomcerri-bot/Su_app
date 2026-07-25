import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, patientsTable } from "@workspace/db";
import { GetDashboardQueryParams } from "@workspace/api-zod";
import { requireAuth, computeAlertLevel } from "../lib/auth";

const router: IRouter = Router();

router.get("/dashboard", requireAuth, async (req, res): Promise<void> => {
  const parsed = GetDashboardQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { teamId } = parsed.data;

  let query = db.select().from(patientsTable).$dynamic();
  if (teamId) {
    query = query.where(eq(patientsTable.teamId, teamId));
  }

  const patients = await query;

  const active = patients.filter((p) => p.patientStatus === "ativo");

  let redAlert = 0;
  let yellowAlert = 0;
  let noAlert = 0;

  for (const p of active) {
    const alert = computeAlertLevel(p.hasOralLesion, p.diagnosis, p.lastEvaluationDate ?? null);
    if (alert === "red") redAlert++;
    else if (alert === "yellow") yellowAlert++;
    else noAlert++;
  }

  res.json({
    totalActive: active.length,
    redAlert,
    yellowAlert,
    noAlert,
  });
});

export default router;
