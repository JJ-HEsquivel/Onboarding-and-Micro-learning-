import { FileX, SquareCheckBig } from 'lucide-react';
import { Alert } from '@/shared/components/Alert';
import { Badge, type BadgeTone } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { EmptyState } from '@/shared/components/EmptyState';
import { PageHeader } from '@/shared/components/PageHeader';
import { StatCard } from '@/shared/components/StatCard';
import { StageGroup } from '@/shared/components/StageGroup';
import { PROGRAM_RULES } from '@/shared/constants/program';
import { formatDate } from '@/shared/lib/dates';
import type { MyDocument } from '@/services/myInduction.service';
import { PendingValidationView } from '../../components/PendingValidationView';
import { useDocumentDialogs } from '../../hooks/useDocumentDialogs';
import { useMyInduction } from '../../hooks/useMyInduction';
import '../../components/induction.css';
import './CollaboratorAssessmentsPage.css';

const EXAM_BADGE: Record<string, { label: string; tone: BadgeTone }> = {
  locked: { label: 'Bloqueada', tone: 'neutral' },
  pending: { label: 'Pendiente', tone: 'warning' },
  passed: { label: 'Aprobada', tone: 'success' },
  failed: { label: 'Reprobada', tone: 'danger' },
};

export default function CollaboratorAssessmentsPage() {
  const { user, data, error, loading, reload } = useMyInduction();
  const onboardingId = data && data.state !== 'noOnboarding' ? data.onboardingId : '';
  const { openReader, openExam, dialogs } = useDocumentDialogs({ personId: user.id, onboardingId, reload });

  if (loading && !data) return <p className="page-loading">Cargando sus evaluaciones…</p>;
  if (error && !data) return <Alert tone="danger">No se pudieron cargar sus evaluaciones. {error.message}</Alert>;
  if (!data || data.state === 'noOnboarding') {
    return (
      <>
        <PageHeader title="Mis evaluaciones" />
        <section className="card">
          <EmptyState icon={FileX} title="Aún no tiene una inducción asignada" />
        </section>
      </>
    );
  }
  if (data.state === 'pendingValidation') {
    return <PendingValidationView firstName={user.fullName.split(' ')[0]} validatorName={data.validatorName} proposed={data.proposed} />;
  }

  const withExam = data.stages
    .map((stage) => ({ ...stage, documents: stage.documents.filter((d) => d.exam) }))
    .filter((stage) => stage.documents.length > 0);
  const examCount = withExam.reduce((sum, stage) => sum + stage.documents.length, 0);

  return (
    <>
      <PageHeader title="Mis evaluaciones" description="Evaluaciones de comprensión pendientes y resultados obtenidos." />

      <div className="my-assessments">
        <div className="my-assessments__stats">
          <StatCard label="Evaluaciones asignadas" value={examCount} caption="Una por documento de su ruta" />
          <StatCard
            label="Puntaje promedio"
            value={data.progress.averageScore === null ? '—' : `${data.progress.averageScore}%`}
            caption={`Mínimo de aprobación ${PROGRAM_RULES.passingScore}%`}
          />
          <StatCard label="Intentos disponibles" value={PROGRAM_RULES.maxAttempts} caption="Por cada evaluación" />
        </div>

        {withExam.length === 0 && (
          <section className="card">
            <EmptyState icon={SquareCheckBig} title="Sus documentos no tienen evaluaciones asignadas" />
          </section>
        )}

        {withExam.map((stage) => (
          <section key={stage.id} className="card my-assessments__stage">
            <StageGroup name={stage.name} summary={`${stage.documents.filter((d) => d.exam?.status === 'passed').length} de ${stage.documents.length} aprobadas`}>
              {stage.documents.map((document) => (
                <li key={document.assignmentId}>
                  <ExamRow document={document} onExam={openExam} onRead={openReader} />
                </li>
              ))}
            </StageGroup>
          </section>
        ))}
      </div>

      {dialogs}
    </>
  );
}

interface ExamRowProps {
  document: MyDocument;
  onExam: (document: MyDocument) => void;
  onRead: (document: MyDocument) => void;
}

function ExamRow({ document, onExam, onRead }: ExamRowProps) {
  const exam = document.exam!;
  const exhausted = document.step === 'exhausted';
  const badge = EXAM_BADGE[exam.status];

  return (
    <div className="exam-row">
      <span className={`exam-row__icon${exam.status === 'passed' ? ' exam-row__icon--passed' : ''}`}>
        <SquareCheckBig size={16} />
      </span>
      <span className="exam-row__info">
        <strong>{document.title}</strong>
        <span className="doc-item__meta">
          <span>Mínimo {PROGRAM_RULES.passingScore}%</span>
          {exam.attemptsUsed > 0 && (
            <span>
              Intento {exam.attemptsUsed} de {PROGRAM_RULES.maxAttempts}
            </span>
          )}
          {exam.dueDate && exam.status !== 'passed' && <span>Vence {formatDate(exam.dueDate)}</span>}
        </span>
      </span>
      <span className="doc-item__actions">
        {exam.score !== null && (
          <strong className={exam.score >= PROGRAM_RULES.passingScore ? 'exam-row__score--ok' : 'exam-row__score--fail'}>
            {exam.score}%
          </strong>
        )}
        <Badge tone={exhausted ? 'danger' : badge.tone}>{exhausted ? 'Intentos agotados' : badge.label}</Badge>
        {exam.status === 'locked' ? (
          <Button variant="secondary" onClick={() => onRead(document)}>
            Requiere lectura
          </Button>
        ) : exam.status === 'passed' || exhausted ? null : (
          <Button onClick={() => onExam(document)}>{exam.status === 'failed' ? 'Reintentar' : 'Rendir evaluación'}</Button>
        )}
      </span>
    </div>
  );
}
