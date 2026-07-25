import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';

// ─── Types ───────────────────────────────────────────────────────────────────

export type Role = 'admin' | 'user';
export type Sex = 'masculino' | 'feminino';
export type SmokingStatus = 'ativo' | 'ex-tabagista';
export type Diagnosis = 'nenhum' | 'em_investigacao' | 'confirmado';
export type PatientStatus = 'ativo' | 'inativo';

export interface DBUser {
  id: number;
  username: string;
  passwordHash: string;
  role: Role;
}

export interface DBTeam {
  id: number;
  name: string;
  createdAt: string;
  patientCount: number;
}

export interface DBPatient {
  id: number;
  identification: string;
  age: number;
  sex: Sex;
  teamId: number;
  teamName: string;
  microarea: string;
  smokingStatus: SmokingStatus;
  hasOralLesion: number; // 0 | 1 from SQLite
  lesionType: string | null;
  diagnosis: Diagnosis;
  lastEvaluationDate: string | null;
  registrationDate: string;
  notes: string | null;
  patientStatus: PatientStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PatientInput {
  identification: string;
  age: number;
  sex: Sex;
  teamId: number;
  microarea: string;
  smokingStatus: SmokingStatus;
  hasOralLesion: boolean;
  lesionType?: string | null;
  diagnosis: Diagnosis;
  lastEvaluationDate?: string | null;
  registrationDate: string;
  notes?: string | null;
  patientStatus: PatientStatus;
}

// ─── Singleton ───────────────────────────────────────────────────────────────

let _db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!_db) {
    _db = await SQLite.openDatabaseAsync('tabagismo.db');
    await _initDb(_db);
  }
  return _db;
}

async function _hash(password: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, password);
}

async function _initDb(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL DEFAULT 'user'
    );

    CREATE TABLE IF NOT EXISTS teams (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS patients (
      id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      identification       TEXT NOT NULL,
      age                  INTEGER NOT NULL,
      sex                  TEXT NOT NULL,
      team_id              INTEGER NOT NULL REFERENCES teams(id),
      microarea            TEXT NOT NULL,
      smoking_status       TEXT NOT NULL,
      has_oral_lesion      INTEGER NOT NULL DEFAULT 0,
      lesion_type          TEXT,
      diagnosis            TEXT NOT NULL DEFAULT 'nenhum',
      last_evaluation_date TEXT,
      registration_date    TEXT NOT NULL,
      notes                TEXT,
      patient_status       TEXT NOT NULL DEFAULT 'ativo',
      created_at           TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const cnt = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM users');
  if (!cnt || cnt.count === 0) {
    const adminHash = await _hash('admin123');
    const userHash = await _hash('user123');
    await db.runAsync(
      "INSERT INTO users (username, password_hash, role) VALUES (?,?,?), (?,?,?)",
      ['admin', adminHash, 'admin', 'usuario', userHash, 'user']
    );
  }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function verifyUser(username: string, password: string): Promise<DBUser | null> {
  const db = await getDb();
  const hash = await _hash(password);
  const row = await db.getFirstAsync<{ id: number; username: string; role: string }>(
    'SELECT id, username, role FROM users WHERE username = ? AND password_hash = ?',
    [username, hash]
  );
  if (!row) return null;
  return { id: row.id, username: row.username, passwordHash: hash, role: row.role as Role };
}

// ─── Teams ────────────────────────────────────────────────────────────────────

export async function getTeams(): Promise<DBTeam[]> {
  const db = await getDb();
  return db.getAllAsync<DBTeam>(`
    SELECT t.id, t.name, t.created_at as createdAt,
           COALESCE(COUNT(p.id), 0) as patientCount
    FROM teams t
    LEFT JOIN patients p ON p.team_id = t.id
    GROUP BY t.id
    ORDER BY t.name
  `);
}

export async function createTeam(name: string): Promise<number> {
  const db = await getDb();
  const r = await db.runAsync('INSERT INTO teams (name) VALUES (?)', [name]);
  return r.lastInsertRowId;
}

export async function updateTeam(id: number, name: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE teams SET name = ? WHERE id = ?', [name, id]);
}

export async function deleteTeam(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM teams WHERE id = ?', [id]);
}

export async function transferPatients(fromId: number, toId: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE patients SET team_id = ? WHERE team_id = ?', [toId, fromId]);
}

// ─── Patients ─────────────────────────────────────────────────────────────────

export async function getPatients(opts?: {
  teamId?: number;
  search?: string;
  includeInactive?: boolean;
}): Promise<DBPatient[]> {
  const db = await getDb();
  const clauses: string[] = [];
  const params: (string | number)[] = [];

  if (!opts?.includeInactive) {
    clauses.push("p.patient_status = 'ativo'");
  }
  if (opts?.teamId) {
    clauses.push('p.team_id = ?');
    params.push(opts.teamId);
  }
  if (opts?.search) {
    clauses.push('(p.identification LIKE ? OR p.microarea LIKE ?)');
    params.push(`%${opts.search}%`, `%${opts.search}%`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  return db.getAllAsync<DBPatient>(
    `SELECT p.id, p.identification, p.age, p.sex,
            p.team_id as teamId, COALESCE(t.name,'') as teamName,
            p.microarea, p.smoking_status as smokingStatus,
            p.has_oral_lesion as hasOralLesion, p.lesion_type as lesionType,
            p.diagnosis, p.last_evaluation_date as lastEvaluationDate,
            p.registration_date as registrationDate, p.notes,
            p.patient_status as patientStatus,
            p.created_at as createdAt, p.updated_at as updatedAt
     FROM patients p LEFT JOIN teams t ON t.id = p.team_id
     ${where}
     ORDER BY p.identification`,
    params
  );
}

export async function getPatient(id: number): Promise<DBPatient | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<DBPatient>(
    `SELECT p.id, p.identification, p.age, p.sex,
            p.team_id as teamId, COALESCE(t.name,'') as teamName,
            p.microarea, p.smoking_status as smokingStatus,
            p.has_oral_lesion as hasOralLesion, p.lesion_type as lesionType,
            p.diagnosis, p.last_evaluation_date as lastEvaluationDate,
            p.registration_date as registrationDate, p.notes,
            p.patient_status as patientStatus,
            p.created_at as createdAt, p.updated_at as updatedAt
     FROM patients p LEFT JOIN teams t ON t.id = p.team_id
     WHERE p.id = ?`,
    [id]
  );
  return row ?? null;
}

export async function createPatient(data: PatientInput): Promise<number> {
  const db = await getDb();
  const r = await db.runAsync(
    `INSERT INTO patients
       (identification, age, sex, team_id, microarea, smoking_status,
        has_oral_lesion, lesion_type, diagnosis, last_evaluation_date,
        registration_date, notes, patient_status)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      data.identification, data.age, data.sex, data.teamId, data.microarea,
      data.smokingStatus, data.hasOralLesion ? 1 : 0,
      data.lesionType ?? null, data.diagnosis,
      data.lastEvaluationDate ?? null, data.registrationDate,
      data.notes ?? null, data.patientStatus,
    ]
  );
  return r.lastInsertRowId;
}

export async function updatePatient(id: number, data: Partial<PatientInput>): Promise<void> {
  const db = await getDb();
  const sets: string[] = [];
  const params: (string | number | null)[] = [];

  if (data.identification !== undefined) { sets.push('identification=?'); params.push(data.identification); }
  if (data.age !== undefined) { sets.push('age=?'); params.push(data.age); }
  if (data.sex !== undefined) { sets.push('sex=?'); params.push(data.sex); }
  if (data.teamId !== undefined) { sets.push('team_id=?'); params.push(data.teamId); }
  if (data.microarea !== undefined) { sets.push('microarea=?'); params.push(data.microarea); }
  if (data.smokingStatus !== undefined) { sets.push('smoking_status=?'); params.push(data.smokingStatus); }
  if (data.hasOralLesion !== undefined) { sets.push('has_oral_lesion=?'); params.push(data.hasOralLesion ? 1 : 0); }
  if (data.lesionType !== undefined) { sets.push('lesion_type=?'); params.push(data.lesionType ?? null); }
  if (data.diagnosis !== undefined) { sets.push('diagnosis=?'); params.push(data.diagnosis); }
  if (data.lastEvaluationDate !== undefined) { sets.push('last_evaluation_date=?'); params.push(data.lastEvaluationDate ?? null); }
  if (data.registrationDate !== undefined) { sets.push('registration_date=?'); params.push(data.registrationDate); }
  if (data.notes !== undefined) { sets.push('notes=?'); params.push(data.notes ?? null); }
  if (data.patientStatus !== undefined) { sets.push('patient_status=?'); params.push(data.patientStatus); }

  sets.push("updated_at=datetime('now')");
  params.push(id);

  await db.runAsync(`UPDATE patients SET ${sets.join(',')} WHERE id=?`, params);
}

export async function removePatient(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM patients WHERE id=?', [id]);
}
