import { Router, type IRouter } from "express";
import { eq, inArray } from "drizzle-orm";
import { db, patientsTable, teamsTable } from "@workspace/db";
import {
  ListPatientsQueryParams,
  CreatePatientBody,
  UpdatePatientParams,
  UpdatePatientBody,
  GetPatientParams,
  DeletePatientParams,
} from "@workspace/api-zod";
import { requireAuth, requireAdmin, computeAlertLevel } from "../lib/auth";

const router: IRouter = Router();

function toDateString(d: Date | string | null | undefined): string | null | undefined {
  if (d == null) return d as null | undefined;
  if (typeof d === "string") return d;
  return d.toISOString().split("T")[0];
}

function normalizePatientInput(data: Record<string, unknown>) {
  return {
    ...data,
    registrationDate: toDateString(data.registrationDate as Date | string) as string,
    lastEvaluationDate: toDateString(data.lastEvaluationDate as Date | string | null),
  };
}

function buildPatientResponse(patient: typeof patientsTable.$inferSelect, teamName: string) {
  const alertLevel = computeAlertLevel(
    patient.hasOralLesion,
    patient.diagnosis,
    patient.lastEvaluationDate ?? null
  );
  return {
    ...patient,
    teamName,
    alertLevel,
  };
}

router.get("/patients", requireAuth, async (req, res): Promise<void> => {
  const parsed = ListPatientsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { teamId, microarea, alertType, sex, search, includeInactive } = parsed.data;

  const rows = await db
    .select({
      patient: patientsTable,
      teamName: teamsTable.name,
    })
    .from(patientsTable)
    .leftJoin(teamsTable, eq(patientsTable.teamId, teamsTable.id))
    .orderBy(patientsTable.createdAt);

  let patients = rows.map(({ patient, teamName }) =>
    buildPatientResponse(patient, teamName ?? "")
  );

  // Filter inactive unless requested
  if (!includeInactive) {
    patients = patients.filter((p) => p.patientStatus === "ativo");
  }

  if (teamId) {
    patients = patients.filter((p) => p.teamId === teamId);
  }

  if (microarea) {
    patients = patients.filter((p) =>
      p.microarea.toLowerCase().includes((microarea as string).toLowerCase())
    );
  }

  if (sex) {
    patients = patients.filter((p) => p.sex === sex);
  }

  if (search) {
    const q = (search as string).toLowerCase();
    patients = patients.filter((p) => p.identification.toLowerCase().includes(q));
  }

  if (alertType) {
    patients = patients.filter((p) => p.alertLevel === alertType);
  }

  res.json(patients);
});

router.post("/patients", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreatePatientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, parsed.data.teamId));
  if (!team) {
    res.status(400).json({ error: "Equipe não encontrada" });
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [patient] = await db.insert(patientsTable).values(normalizePatientInput(parsed.data as any) as any).returning();
  res.status(201).json(buildPatientResponse(patient, team.name));
});

type CsvRow = {
  identificacao: string;
  idade: number;
  sexo: "masculino" | "feminino";
  equipe: string;
  microarea: string;
  tabagismo: "ativo" | "ex-tabagista";
  lesao: "sim" | "nao" | "não";
  diagnostico: "nenhum" | "em_investigacao" | "confirmado";
  data_avaliacao: string | undefined;
  lineNumber: number;
};

function validateCsvRow(
  parts: string[],
  lineNumber: number,
): { ok: true; row: CsvRow } | { ok: false; message: string } {
  const [identificacao, idadeRaw, sexo, equipe, microarea, tabagismo, lesao, diagnostico, data_avaliacao] =
    parts.map((p) => p.trim());

  if (!identificacao) return { ok: false, message: "identificacao está vazia" };
  if (!equipe) return { ok: false, message: "equipe está vazia" };
  if (!microarea) return { ok: false, message: "microarea está vazia" };

  const idade = Number(idadeRaw);
  if (!idadeRaw || !Number.isInteger(idade) || idade < 0 || idade > 150)
    return { ok: false, message: `idade inválida: "${idadeRaw}"` };

  if (sexo !== "masculino" && sexo !== "feminino")
    return { ok: false, message: `sexo inválido: "${sexo}" (esperado: masculino ou feminino)` };

  if (tabagismo !== "ativo" && tabagismo !== "ex-tabagista")
    return { ok: false, message: `tabagismo inválido: "${tabagismo}" (esperado: ativo ou ex-tabagista)` };

  if (lesao !== "sim" && lesao !== "nao" && lesao !== "não")
    return { ok: false, message: `lesao inválido: "${lesao}" (esperado: sim ou nao)` };

  if (diagnostico !== "nenhum" && diagnostico !== "em_investigacao" && diagnostico !== "confirmado")
    return { ok: false, message: `diagnostico inválido: "${diagnostico}" (esperado: nenhum, em_investigacao ou confirmado)` };

  if (data_avaliacao && !/^\d{4}-\d{2}-\d{2}$/.test(data_avaliacao))
    return { ok: false, message: `data_avaliacao inválida: "${data_avaliacao}" (esperado: AAAA-MM-DD)` };

  return {
    ok: true,
    row: {
      identificacao,
      idade,
      sexo,
      equipe,
      microarea,
      tabagismo,
      lesao,
      diagnostico,
      data_avaliacao: data_avaliacao || undefined,
      lineNumber,
    },
  };
}

// CSV import — must be defined before /:id
router.post("/patients/import", requireAuth, async (req, res): Promise<void> => {
  const { csvText } = req.body as { csvText?: unknown };
  if (typeof csvText !== "string" || !csvText.trim()) {
    res.status(400).json({ error: "csvText é obrigatório" });
    return;
  }

  const lines = csvText.trim().split(/\r?\n/);
  const hasHeader = lines[0]?.toLowerCase().includes("identificacao");
  const dataLines = hasHeader ? lines.slice(1) : lines;

  const errors: { line: number; message: string }[] = [];
  const validRows: CsvRow[] = [];

  for (let i = 0; i < dataLines.length; i++) {
    const rawLine = dataLines[i]?.trim();
    if (!rawLine) continue;
    const lineNumber = hasHeader ? i + 2 : i + 1;
    const parts = rawLine.split(",");
    if (parts.length < 8) {
      errors.push({ line: lineNumber, message: `Número de colunas inválido (esperado 8-9, encontrado ${parts.length})` });
      continue;
    }
    const result = validateCsvRow(parts, lineNumber);
    if (!result.ok) {
      errors.push({ line: lineNumber, message: (result as any).message });
      continue;
    }
    validRows.push((result as any).row);
  }

  if (validRows.length === 0) {
    res.json({ inserted: 0, skipped: 0, errors });
    return;
  }

  // Load existing teams and patients in one shot
  const allTeams = await db.select().from(teamsTable);
  const teamMap = new Map<string, any>(allTeams.map((t) => [t.name.toLowerCase(), t]));

  const identifications = validRows.map((r) => r.identificacao);
  const existingPatients = await db
    .select({ identification: patientsTable.identification })
    .from(patientsTable)
    .where(inArray(patientsTable.identification, identifications));
  const existingIds = new Set(existingPatients.map((p) => p.identification.toLowerCase()));

  let inserted = 0;
  let skipped = 0;

  for (const row of validRows) {
    // Skip duplicates
    if (existingIds.has(row.identificacao.toLowerCase())) {
      skipped++;
      continue;
    }

    // Resolve or create team
    let team = teamMap.get(row.equipe.toLowerCase());
    if (!team) {
      const [created] = await db.insert(teamsTable).values({ name: row.equipe }).returning();
      team = created;
      teamMap.set(row.equipe.toLowerCase(), team);
    }

    try {
      await db.insert(patientsTable).values({
        identification: row.identificacao,
        age: row.idade,
        sex: row.sexo,
        teamId: (team as any).id,
        microarea: row.microarea,
        smokingStatus: row.tabagismo,
        hasOralLesion: row.lesao === "sim",
        diagnosis: row.diagnostico,
        lastEvaluationDate: row.data_avaliacao ?? null,
        registrationDate: new Date().toISOString().split("T")[0],
        patientStatus: "ativo",
      });
      existingIds.add(row.identificacao.toLowerCase());
      inserted++;
    } catch (err) {
      errors.push({ line: row.lineNumber, message: `Erro ao inserir: ${String(err)}` });
    }
  }

  res.json({ inserted, skipped, errors });
});

router.get("/patients/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetPatientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .select({ patient: patientsTable, teamName: teamsTable.name })
    .from(patientsTable)
    .leftJoin(teamsTable, eq(patientsTable.teamId, teamsTable.id))
    .where(eq(patientsTable.id, params.data.id));

  if (!row) {
    res.status(404).json({ error: "Paciente não encontrado" });
    return;
  }

  res.json(buildPatientResponse(row.patient, row.teamName ?? ""));
});

router.patch("/patients/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdatePatientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdatePatientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db.select().from(patientsTable).where(eq(patientsTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Paciente não encontrado" });
    return;
  }

  if (parsed.data.teamId) {
    const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, parsed.data.teamId));
    if (!team) {
      res.status(400).json({ error: "Equipe não encontrada" });
      return;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [updated] = await db
    .update(patientsTable)
    .set(normalizePatientInput(parsed.data as any) as any)
    .where(eq(patientsTable.id, params.data.id))
    .returning();

  const [teamRow] = await db.select().from(teamsTable).where(eq(teamsTable.id, updated.teamId));
  res.json(buildPatientResponse(updated, teamRow?.name ?? ""));
});

router.delete("/patients/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = DeletePatientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [patient] = await db.select().from(patientsTable).where(eq(patientsTable.id, params.data.id));
  if (!patient) {
    res.status(404).json({ error: "Paciente não encontrado" });
    return;
  }

  await db.delete(patientsTable).where(eq(patientsTable.id, params.data.id));
  res.json({ success: true, message: "Paciente excluído com sucesso" });
});

export default router;
