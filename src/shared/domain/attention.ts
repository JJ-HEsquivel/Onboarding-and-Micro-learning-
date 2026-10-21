/**
 * Motivos por los que un colaborador aparece en "Requiere atención" (Admin y Manager).
 * Función pura: recibe los datos ya leídos y devuelve los motivos en texto.
 */
import { daysBetween } from '@/shared/lib/dates';
import type { CollaboratorStatus } from '@/shared/types/onboarding';
import { isExamExhausted, type RouteItemState } from './onboardingProgress';

export interface AttentionInput {
  status: CollaboratorStatus;
  managerName: string;
  items: (RouteItemState & { documentTitle: string })[];
  /** Fecha "AAAA-MM-DD" de su última lectura o examen, o null. */
  lastActivity: string | null;
  /** Fecha desde la que se mide la inactividad si nunca tuvo actividad (ej. validación). */
  activeSince: string | null;
  today: string;
  maxAttempts: number;
  /** Días sin actividad a partir de los que se avisa. */
  inactivityDays: number;
}

export function attentionReasons(input: AttentionInput): string[] {
  const { status, items, today } = input;
  if (status === 'pendingValidation') return [`Pendiente de validación de ${input.managerName}`];
  if (status === 'completed') return [];

  const reasons: string[] = [];
  const overdueReadings = items.filter((item) => !item.isRead && item.dueDate !== null && item.dueDate < today).length;
  if (overdueReadings) reasons.push(`${overdueReadings} lectura(s) vencida(s)`);

  for (const item of items) {
    if (item.exam?.status !== 'failed') continue;
    reasons.push(
      isExamExhausted(item.exam, input.maxAttempts)
        ? `Intentos agotados en ${item.documentTitle}`
        : `Reprobó ${item.documentTitle}`,
    );
  }

  const since = input.lastActivity ?? input.activeSince;
  if (since) {
    const idle = daysBetween(since, today);
    if (idle >= input.inactivityDays) reasons.push(`${idle} días sin actividad`);
  }
  return reasons;
}
