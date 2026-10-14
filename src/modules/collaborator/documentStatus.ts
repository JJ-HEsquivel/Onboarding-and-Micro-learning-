import type { BadgeTone } from '@/shared/components/Badge';
import type { MyDocument } from '@/services/myInduction.service';

/** Estado de un documento en el lenguaje del colaborador (función pura). */
export function documentStatus(document: MyDocument, today: string): { label: string; tone: BadgeTone } {
  const { step, exam } = document;
  if (step === 'read') {
    const overdue = document.dueDate !== null && document.dueDate < today;
    return overdue ? { label: 'Lectura vencida', tone: 'danger' } : { label: 'Por leer', tone: 'warning' };
  }
  if (step === 'exhausted') return { label: 'Intentos agotados', tone: 'danger' };
  if (step === 'exam') {
    return exam?.status === 'failed'
      ? { label: `Reprobado · ${exam.score ?? 0}%`, tone: 'danger' }
      : { label: 'Examen pendiente', tone: 'info' };
  }
  return exam?.score != null ? { label: `Aprobado · ${exam.score}%`, tone: 'success' } : { label: 'Leído', tone: 'success' };
}
