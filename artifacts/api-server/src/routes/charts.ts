import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, patientsTable, teamsTable } from "@workspace/db";
import {
  GetSexDistributionQueryParams,
  GetAgeDistributionQueryParams,
  GetAlertStatusQueryParams,
  GetMonthlyEvolutionQueryParams,
} from "@workspace/api-zod";
import { requireAuth, computeAlertLevel } from "../lib/auth";

const router: IRouter = Router();

async function getActivePatients(teamId?: number | null) {
  let query = db.select().from(patientsTable).$dynamic();
  if (teamId) {
    query = query.where(eq(patientsTable.teamId, teamId));
  }
  const all = await query;
  return all.filter((p) => p.patientStatus === "ativo");
}

router.get("/charts/sex-distribution", requireAuth, async (req, res): Promise<void> => {
  const parsed = GetSexDistributionQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const patients = await getActivePatients(parsed.data.teamId);
  const masculino = patients.filter((p) => p.sex === "masculino").length;
  const feminino = patients.filter((p) => p.sex === "feminino").length;

  res.json({ masculino, feminino });
});

router.get("/charts/age-distribution", requireAuth, async (req, res): Promise<void> => {
  const parsed = GetAgeDistributionQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const patients = await getActivePatients(parsed.data.teamId);

  const under30 = patients.filter((p) => p.age < 30).length;
  const from30to44 = patients.filter((p) => p.age >= 30 && p.age <= 44).length;
  const from45to59 = patients.filter((p) => p.age >= 45 && p.age <= 59).length;
  const over60 = patients.filter((p) => p.age >= 60).length;

  res.json({ under30, from30to44, from45to59, over60 });
});

router.get("/charts/alert-status", requireAuth, async (req, res): Promise<void> => {
  const parsed = GetAlertStatusQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const patients = await getActivePatients(parsed.data.teamId);

  let red = 0;
  let yellow = 0;
  let none = 0;

  for (const p of patients) {
    const alert = computeAlertLevel(p.hasOralLesion, p.diagnosis, p.lastEvaluationDate ?? null);
    if (alert === "red") red++;
    else if (alert === "yellow") yellow++;
    else none++;
  }

  res.json({ red, yellow, none });
});

router.get("/charts/monthly-evolution", requireAuth, async (req, res): Promise<void> => {
  const parsed = GetMonthlyEvolutionQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { teamId } = parsed.data;

  // Fetch relevant teams
  let allTeams = await db.select().from(teamsTable);
  if (teamId) {
    allTeams = allTeams.filter((t) => t.id === teamId);
  }

  // Fetch all active patients (optionally filtered by team)
  let patientQuery = db.select().from(patientsTable).$dynamic();
  if (teamId) {
    patientQuery = patientQuery.where(eq(patientsTable.teamId, teamId));
  }
  const allPatients = await patientQuery;
  const activePatients = allPatients.filter((p) => p.patientStatus === "ativo");

  const now = new Date();
  const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const points = [];

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    const label = `${monthNames[month]}/${String(year).slice(2)}`;
    const endIso = `${year}-${String(month + 1).padStart(2, "0")}-${String(new Date(year, month + 1, 0).getDate()).padStart(2, "0")}`;

    // Patients registered on or before end of this month
    const snapshot = activePatients.filter((p) => p.registrationDate <= endIso);

    const point: Record<string, string | number> = { month: label, total: snapshot.length };

    for (const team of allTeams) {
      point[String(team.id)] = snapshot.filter((p) => p.teamId === team.id).length;
    }

    points.push(point);
  }

  res.json({ teams: allTeams, points });
});

export default router;
