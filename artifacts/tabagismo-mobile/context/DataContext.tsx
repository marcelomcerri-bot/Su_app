import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  getDb, getTeams, getPatients, createTeam, updateTeam, deleteTeam,
  createPatient, updatePatient, removePatient, transferPatients,
  type DBTeam, type DBPatient, type PatientInput,
} from '@/lib/database';
import { computeAlertLevel } from '@/lib/alerts';

export interface DashboardStats {
  totalActive: number;
  redAlert: number;
  yellowAlert: number;
  noAlert: number;
}

interface DataContextType {
  teams: DBTeam[];
  patients: DBPatient[];
  isLoading: boolean;
  refresh: () => Promise<void>;
  stats: DashboardStats;
  // Teams
  addTeam: (name: string) => Promise<void>;
  editTeam: (id: number, name: string) => Promise<void>;
  deleteTeam: (id: number, transferToId?: number) => Promise<void>;
  // Patients
  addPatient: (data: PatientInput) => Promise<number>;
  editPatient: (id: number, data: Partial<PatientInput>) => Promise<void>;
  deletePatient: (id: number) => Promise<void>;
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [teams, setTeams] = useState<DBTeam[]>([]);
  const [patients, setPatients] = useState<DBPatient[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      await getDb();
      const [t, p] = await Promise.all([
        getTeams(),
        getPatients({ includeInactive: true }),
      ]);
      setTeams(t);
      setPatients(p);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const activePatients = patients.filter(p => p.patientStatus === 'ativo');
  const stats: DashboardStats = {
    totalActive: activePatients.length,
    redAlert: activePatients.filter(p => computeAlertLevel(p) === 'red').length,
    yellowAlert: activePatients.filter(p => computeAlertLevel(p) === 'yellow').length,
    noAlert: activePatients.filter(p => computeAlertLevel(p) === 'none').length,
  };

  const addTeam = useCallback(async (name: string) => { await createTeam(name); await refresh(); }, [refresh]);
  const editTeam = useCallback(async (id: number, name: string) => { await updateTeam(id, name); await refresh(); }, [refresh]);
  const removeTeam = useCallback(async (id: number, transferToId?: number) => {
    if (transferToId !== undefined) await transferPatients(id, transferToId);
    await deleteTeam(id);
    await refresh();
  }, [refresh]);

  const addPatient = useCallback(async (data: PatientInput) => {
    const id = await createPatient(data);
    await refresh();
    return id;
  }, [refresh]);

  const editPatient = useCallback(async (id: number, data: Partial<PatientInput>) => {
    await updatePatient(id, data);
    await refresh();
  }, [refresh]);

  const delPatient = useCallback(async (id: number) => {
    await removePatient(id);
    await refresh();
  }, [refresh]);

  return (
    <DataContext.Provider value={{
      teams, patients, isLoading, refresh, stats,
      addTeam, editTeam, deleteTeam: removeTeam,
      addPatient, editPatient, deletePatient: delPatient,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData(): DataContextType {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
