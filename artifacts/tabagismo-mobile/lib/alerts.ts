import type { DBPatient } from './database';

export type AlertLevel = 'red' | 'yellow' | 'none';

export function computeAlertLevel(p: DBPatient): AlertLevel {
  if (p.patientStatus === 'inativo') return 'none';
  if (p.hasOralLesion && p.diagnosis === 'nenhum') return 'red';
  if (p.lastEvaluationDate) {
    const diffMs = Date.now() - new Date(p.lastEvaluationDate).getTime();
    if (diffMs > 365 * 24 * 60 * 60 * 1000) return 'yellow';
  }
  return 'none';
}

export function alertLabel(level: AlertLevel): string {
  if (level === 'red') return 'Crítico';
  if (level === 'yellow') return 'Atrasado';
  return 'Regular';
}
