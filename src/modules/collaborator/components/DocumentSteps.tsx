import type { DocumentStep } from '@/shared/domain/onboardingProgress';

/** Pasos de un documento: Lectura → Examen → Aprobado. */
export function DocumentSteps({ step, isRead }: { step: DocumentStep; isRead: boolean }) {
  const approved = step === 'approved';
  const steps = [
    { label: 'Lectura', done: isRead, current: !isRead },
    { label: 'Examen', done: approved, current: isRead && !approved },
    { label: 'Aprobado', done: approved, current: false },
  ];
  return (
    <span className="doc-steps" aria-label={`Paso actual: ${steps.find((s) => s.current)?.label ?? 'Aprobado'}`}>
      {steps.map((s, i) => (
        <span key={s.label} className="doc-steps">
          {i > 0 && <i className="doc-steps__line" />}
          <span
            className={`doc-steps__step${s.done ? ' doc-steps__step--done' : s.current ? ' doc-steps__step--current' : ''}`}
          >
            {s.done ? '✓ ' : ''}
            {s.label}
          </span>
        </span>
      ))}
    </span>
  );
}
