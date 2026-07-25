import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import bcryptjs from "bcryptjs";
import * as schema from "./schema";
import { usersTable, teamsTable, patientsTable } from "./schema";

const { Pool } = pg;

let pool: any;
let db: any;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.warn("⚠️ DATABASE_URL not set. Using in-memory fallback mock database.");

  // Shared in-memory tables stored in global to survive hot reloads / multi-imports
  if (!(global as any).__mockUsers) {
    (global as any).__mockUsers = [
      { id: 1, username: "admin", passwordHash: bcryptjs.hashSync("admin123", 10), role: "admin", createdAt: new Date() },
      { id: 2, username: "usuario", passwordHash: bcryptjs.hashSync("user123", 10), role: "user", createdAt: new Date() },
    ];
  }
  if (!(global as any).__mockTeams) {
    (global as any).__mockTeams = [
      { id: 1, name: "Equipe Azul", createdAt: new Date() },
      { id: 2, name: "Equipe Verde", createdAt: new Date() },
    ];
  }
  if (!(global as any).__mockPatients) {
    (global as any).__mockPatients = [
      {
        id: 1,
        identification: "João da Silva",
        age: 54,
        sex: "masculino",
        teamId: 1,
        microarea: "A1",
        smokingStatus: "ativo",
        hasOralLesion: true,
        lesionType: "Placa esbranquiçada",
        diagnosis: "em_investigacao",
        lastEvaluationDate: "2026-07-20",
        registrationDate: "2026-01-10",
        notes: "Paciente com placas brancas na mucosa jugal esquerda.",
        patientStatus: "ativo",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 2,
        identification: "Maria Souza",
        age: 62,
        sex: "feminino",
        teamId: 1,
        microarea: "A2",
        smokingStatus: "ex-tabagista",
        hasOralLesion: false,
        lesionType: null,
        diagnosis: "nenhum",
        lastEvaluationDate: null,
        registrationDate: "2026-02-15",
        notes: null,
        patientStatus: "ativo",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 3,
        identification: "Pedro Alves",
        age: 45,
        sex: "masculino",
        teamId: 2,
        microarea: "B1",
        smokingStatus: "ativo",
        hasOralLesion: true,
        lesionType: "Lesão ulcerada",
        diagnosis: "confirmado",
        lastEvaluationDate: "2026-07-22",
        registrationDate: "2026-03-01",
        notes: "Acompanhamento conjunto com estomatologia.",
        patientStatus: "ativo",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  }

  const dbToJsKey = (table: any, dbKey: string): string => {
    if (dbKey === "team_id") return "teamId";
    if (dbKey === "password_hash") return "passwordHash";
    if (dbKey === "created_at") return "createdAt";
    if (dbKey === "updated_at") return "updatedAt";
    if (dbKey === "has_oral_lesion") return "hasOralLesion";
    if (dbKey === "lesion_type") return "lesionType";
    if (dbKey === "last_evaluation_date") return "lastEvaluationDate";
    if (dbKey === "registration_date") return "registrationDate";
    if (dbKey === "patient_status") return "patientStatus";
    return dbKey;
  };

  const parseCondition = (cond: any) => {
    if (!cond || !cond.queryChunks) return null;
    const chunks = cond.queryChunks;
    let columnName = "";
    let value: any = undefined;
    let operator = "eq";

    for (const chunk of chunks) {
      if (chunk && chunk.name) {
        columnName = chunk.name;
      } else if (chunk && typeof chunk === "object" && "value" in chunk) {
        if (Array.isArray(chunk.value)) {
          if (chunk.value.length === 1 && typeof chunk.value[0] === "string" && chunk.value[0].includes("in")) {
            operator = "in";
          }
        } else {
          value = chunk.value;
        }
      } else if (Array.isArray(chunk)) {
        operator = "in";
        value = chunk.map((c: any) => c.value);
      }
    }

    return { columnName, value, operator };
  };

  class MockQuery {
    private table: any = null;
    private conditions: any[] = [];
    private selectFields: any = null;

    constructor(selectFields: any = null) {
      this.selectFields = selectFields;
    }

    from(table: any) {
      this.table = table;
      return this;
    }

    leftJoin(targetTable: any, condition: any) {
      return this;
    }

    groupBy(...args: any[]) {
      return this;
    }

    orderBy(field: any) {
      return this;
    }

    where(condition: any) {
      if (condition) {
        this.conditions.push(condition);
      }
      return this;
    }

    $dynamic() {
      return this;
    }

    then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
      let result: any[] = [];

      if (this.table === usersTable) {
        result = [...(global as any).__mockUsers];
        for (const cond of this.conditions) {
          const parsed = parseCondition(cond);
          if (parsed) {
            const key = dbToJsKey(this.table, parsed.columnName);
            if (parsed.operator === "in" && Array.isArray(parsed.value)) {
              result = result.filter((item) => parsed.value.includes(item[key]));
            } else {
              result = result.filter((item) => item[key] === parsed.value);
            }
          }
        }
      } else if (this.table === teamsTable) {
        result = (global as any).__mockTeams.map((t: any) => {
          if (this.selectFields && "patientCount" in this.selectFields) {
            const countVal = (global as any).__mockPatients.filter(
              (p: any) => p.teamId === t.id && p.patientStatus === "ativo"
            ).length;
            return { id: t.id, name: t.name, createdAt: t.createdAt, patientCount: countVal };
          }
          return t;
        });

        for (const cond of this.conditions) {
          const parsed = parseCondition(cond);
          if (parsed) {
            const key = dbToJsKey(this.table, parsed.columnName);
            if (parsed.operator === "in" && Array.isArray(parsed.value)) {
              result = result.filter((item) => parsed.value.includes(item[key]));
            } else {
              result = result.filter((item) => item[key] === Number(parsed.value));
            }
          }
        }
      } else if (this.table === patientsTable) {
        if (this.selectFields && this.selectFields.patient && this.selectFields.teamName) {
          result = (global as any).__mockPatients.map((p: any) => {
            const team = (global as any).__mockTeams.find((t: any) => t.id === p.teamId);
            return {
              patient: p,
              teamName: team ? team.name : "",
            };
          });
        } else if (this.selectFields && "patientCount" in this.selectFields) {
          let filtered = [...(global as any).__mockPatients];
          for (const cond of this.conditions) {
            const parsed = parseCondition(cond);
            if (parsed) {
              const key = dbToJsKey(this.table, parsed.columnName);
              if (parsed.operator === "in" && Array.isArray(parsed.value)) {
                filtered = filtered.filter((item) => parsed.value.includes(item[key]));
              } else {
                filtered = filtered.filter((item) => item[key] === Number(parsed.value));
              }
            }
          }
          result = [{ patientCount: filtered.length }];
        } else {
          result = [...(global as any).__mockPatients];
          for (const cond of this.conditions) {
            const parsed = parseCondition(cond);
            if (parsed) {
              const key = dbToJsKey(this.table, parsed.columnName);
              if (parsed.operator === "in" && Array.isArray(parsed.value)) {
                result = result.filter((item) => parsed.value.includes(item[key]));
              } else {
                const cmpVal = typeof result[0]?.[key] === "number" ? Number(parsed.value) : parsed.value;
                result = result.filter((item) => item[key] === cmpVal);
              }
            }
          }
        }
      }

      return Promise.resolve(result).then(onfulfilled, onrejected);
    }
  }

  class MockInsert {
    private table: any;
    private data: any;

    constructor(table: any) {
      this.table = table;
    }

    values(data: any) {
      this.data = data;
      return this;
    }

    returning() {
      return this;
    }

    then(onfulfilled?: (value: any) => any) {
      const items = Array.isArray(this.data) ? this.data : [this.data];
      const results: any[] = [];

      for (const item of items) {
        if (this.table === teamsTable) {
          const id =
            (global as any).__mockTeams.length > 0
              ? Math.max(...(global as any).__mockTeams.map((t: any) => t.id)) + 1
              : 1;
          const inserted = {
            id,
            name: item.name,
            createdAt: new Date(),
          };
          (global as any).__mockTeams.push(inserted);
          results.push(inserted);
        } else if (this.table === patientsTable) {
          const id =
            (global as any).__mockPatients.length > 0
              ? Math.max(...(global as any).__mockPatients.map((p: any) => p.id)) + 1
              : 1;
          const inserted = {
            id,
            identification: item.identification,
            age: Number(item.age),
            sex: item.sex,
            teamId: Number(item.teamId),
            microarea: item.microarea,
            smokingStatus: item.smokingStatus,
            hasOralLesion: !!item.hasOralLesion,
            lesionType: item.lesionType || null,
            diagnosis: item.diagnosis || "nenhum",
            lastEvaluationDate: item.lastEvaluationDate || null,
            registrationDate: item.registrationDate || new Date().toISOString().split("T")[0],
            notes: item.notes || null,
            patientStatus: item.patientStatus || "ativo",
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          (global as any).__mockPatients.push(inserted);
          results.push(inserted);
        }
      }

      return Promise.resolve(results).then(onfulfilled);
    }
  }

  class MockUpdate {
    private table: any;
    private updateData: any;
    private condition: any;

    constructor(table: any) {
      this.table = table;
    }

    set(data: any) {
      this.updateData = data;
      return this;
    }

    where(condition: any) {
      this.condition = condition;
      return this;
    }

    returning() {
      return this;
    }

    then(onfulfilled?: (value: any) => any) {
      const parsedCond = parseCondition(this.condition);
      const results: any[] = [];

      let arrayToSearch: any[] = [];
      if (this.table === teamsTable) {
        arrayToSearch = (global as any).__mockTeams;
      } else if (this.table === patientsTable) {
        arrayToSearch = (global as any).__mockPatients;
      }

      const key = parsedCond ? dbToJsKey(this.table, parsedCond.columnName) : null;
      const val = parsedCond ? parsedCond.value : null;

      for (const item of arrayToSearch) {
        let matches = false;
        if (!parsedCond) {
          matches = true;
        } else if (key) {
          const cmpVal = typeof item[key] === "number" ? Number(val) : val;
          if (item[key] === cmpVal) {
            matches = true;
          }
        }

        if (matches) {
          for (const [rawK, rawV] of Object.entries(this.updateData)) {
            const mappedKey = dbToJsKey(this.table, rawK);
            item[mappedKey] = rawV;
          }
          item.updatedAt = new Date();
          results.push(item);
        }
      }

      return Promise.resolve(results).then(onfulfilled);
    }
  }

  class MockDelete {
    private table: any;
    private condition: any;

    constructor(table: any) {
      this.table = table;
    }

    where(condition: any) {
      this.condition = condition;
      return this;
    }

    then(onfulfilled?: (value: any) => any) {
      const parsedCond = parseCondition(this.condition);
      const key = parsedCond ? dbToJsKey(this.table, parsedCond.columnName) : null;
      const val = parsedCond ? parsedCond.value : null;

      if (this.table === teamsTable) {
        (global as any).__mockTeams = (global as any).__mockTeams.filter((t: any) => {
          if (!parsedCond) return false;
          const cmpVal = typeof t[key!] === "number" ? Number(val) : val;
          return t[key!] !== cmpVal;
        });
      } else if (this.table === patientsTable) {
        (global as any).__mockPatients = (global as any).__mockPatients.filter((p: any) => {
          if (!parsedCond) return false;
          const cmpVal = typeof p[key!] === "number" ? Number(val) : val;
          return p[key!] !== cmpVal;
        });
      }

      return Promise.resolve({ success: true }).then(onfulfilled);
    }
  }

  pool = new Proxy(
    {},
    {
      get: (target, prop) => {
        if (prop === "connect") {
          return async () => ({
            query: async () => ({ rows: [] }),
            release: () => {},
          });
        }
        if (prop === "query") {
          return async () => ({ rows: [] });
        }
        return () => {};
      },
    }
  );

  db = {
    select: (fields?: any) => new MockQuery(fields),
    insert: (table: any) => new MockInsert(table),
    update: (table: any) => new MockUpdate(table),
    delete: (table: any) => new MockDelete(table),
  };
} else {
  pool = new Pool({ connectionString: databaseUrl });
  db = drizzle(pool, { schema });
}

export { pool, db };
export * from "./schema";
