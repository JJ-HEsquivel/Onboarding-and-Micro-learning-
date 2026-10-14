/**
 * Reglas de avance de una inducción (funciones puras, sin acceso a datos).
 *
 * - Un documento "suma" (queda aprobado) cuando su lectura está confirmada Y su examen aprobado.
 *   Confirmar la lectura sola no suma: solo habilita el examen.
 * - La inducción se completa cuando todos los documentos están aprobados.
 * - Está atrasada si hay una lectura o un examen pendiente con la fecha de vencimiento pasada.
 * - Riesgo alto: atrasada o con intentos agotados. Medio: algún examen reprobado. Bajo: el resto.
 */
import type { ProgressSummary, RiskLevel } from '@/shared/types/onboarding';

export type ExamStatus = 'locked' | 'pending' | 'passed' | 'failed';

export interface ExamState {
  status: ExamStatus;
  /** Puntaje del último intento (%). */
  score: number | null;
  attemptsUsed: number;
  /** "AAAA-MM-DD" */
  dueDate: string | null;
}

/** Un documento de la ruta de una persona, con su examen. */
export interface RouteItemState {
  isRead: boolean;
  /** Vencimiento de la lectura, "AAAA-MM-DD". */
  dueDate: string | null;
  /** null si el documento no tiene evaluación. */
  exam: ExamState | null;
}

/** Próximo paso de un documento: leer → rendir el examen → aprobado. */
export type DocumentStep = 'read' | 'exam' | 'exhausted' | 'approved';

export function isExamExhausted(exam: ExamState, maxAttempts: number): boolean {
  return exam.status === 'failed' && exam.attemptsUsed >= maxAttempts;
}

export function documentStep(item: RouteItemState, maxAttempts: number): DocumentStep {
  if (!item.isRead) return 'read';
  if (!item.exam || item.exam.status === 'passed') return 'approved';
  if (isExamExhausted(item.exam, maxAttempts)) return 'exhausted';
  return 'exam';
}

function isOverdue(item: RouteItemState, today: string): boolean {
  const pastDue = (date: string | null) => date !== null && date < today;
  if (!item.isRead) return pastDue(item.dueDate);
  return item.exam !== null && (item.exam.status === 'pending' || item.exam.status === 'failed') && pastDue(item.exam.dueDate);
}

export function computeProgress(items: RouteItemState[], today: string, maxAttempts: number): ProgressSummary {
  const steps = items.map((item) => documentStep(item, maxAttempts));
  const total = items.length;
  const approved = steps.filter((step) => step === 'approved').length;
  const read = items.filter((item) => item.isRead).length;
  const examsToTake = steps.filter((step) => step === 'exam').length;

  const scores = items.flatMap((item) => (item.exam?.score != null ? [item.exam.score] : []));
  const averageScore = scores.length ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length) : null;

  const hasOverdue = items.some((item) => isOverdue(item, today));
  const hasExhausted = steps.includes('exhausted');
  const hasFailed = items.some((item) => item.exam?.status === 'failed');

  let status: ProgressSummary['status'];
  if (total > 0 && approved === total) status = 'completed';
  else if (hasOverdue) status = 'overdue';
  else if (read === 0 && scores.length === 0) status = 'notStarted';
  else status = 'inProgress';

  let risk: RiskLevel = 'low';
  if (status !== 'completed') {
    if (hasOverdue || hasExhausted) risk = 'high';
    else if (hasFailed) risk = 'medium';
  }

  return { total, read, approved, examsToTake, averageScore, status, risk };
}
