import type { BadgeTone } from '@/shared/components/Badge';
import type { DocumentStep, ExamState } from '@/shared/domain/onboardingProgress';

interface DocumentState {
  step: DocumentStep;
  exam: ExamState | null;
  /** Vencimiento de la lectura, "AAAA-MM-DD". */
  dueDate: string | null;
}

/** Estado de un documento de la ruta en lenguaje simple (función pura). */
export function documentStatus(document: DocumentState, today: string): { label: string; tone: BadgeTone } {
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
