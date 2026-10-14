import { useNavigate } from 'react-router';
import { FileX } from 'lucide-react';
import { Alert } from '@/shared/components/Alert';
import { Button } from '@/shared/components/Button';
import { EmptyState } from '@/shared/components/EmptyState';
import { PageHeader } from '@/shared/components/PageHeader';
import { ProgressRing } from '@/shared/components/ProgressRing';
import { ONBOARDING_PHASES } from '@/shared/constants/program';
import { formatDate } from '@/shared/lib/dates';
import { PendingValidationView } from '../../components/PendingValidationView';
import { useMyInduction } from '../../hooks/useMyInduction';
import './CollaboratorProgressPage.css';

const percent = (part: number, total: number) => (total ? Math.round((part / total) * 100) : 0);

export default function CollaboratorProgressPage() {
  const { user, data, error, loading } = useMyInduction();
  const navigate = useNavigate();
  const firstName = user.fullName.split(' ')[0];

  if (loading && !data) return <p className="page-loading">Cargando su avance…</p>;
  if (error && !data) return <Alert tone="danger">No se pudo cargar su avance. {error.message}</Alert>;
  if (!data || data.state === 'noOnboarding') {
    return (
      <>
        <PageHeader title={`Hola, ${firstName}`} />
        <section className="card">
          <EmptyState icon={FileX} title="Aún no tiene una inducción asignada" />
        </section>
      </>
    );
  }
  if (data.state === 'pendingValidation') {
    return <PendingValidationView firstName={firstName} validatorName={data.validatorName} proposed={data.proposed} />;
  }

  const { progress } = data;
  const completed = progress.status === 'completed';
  const currentPhase = completed ? 3 : 2;
  const nextDue = data.stages
    .flatMap((stage) => stage.documents)
    .filter((d) => !d.isRead && d.dueDate)
    .map((d) => d.dueDate!)
    .sort()[0];

  const phaseNotes: Record<number, string> = {
    1: `Ruta activada${data.validatorName ? ` por ${data.validatorName}` : ''}${data.validatedOn ? ` el ${formatDate(data.validatedOn)}` : ''}`,
    2: completed
      ? `Completada: ${progress.total} de ${progress.total} documentos aprobados`
      : `${progress.approved} de ${progress.total} documentos aprobados`,
    3: completed ? 'Refuerzo continuo activo' : 'Se habilita al aprobar todos sus documentos',
  };

  return (
    <>
      <PageHeader
        title={`Hola, ${firstName}`}
        description={
          completed
            ? 'Aprobó todos sus documentos. Le avisaremos cuando un documento cambie de versión.'
            : `Lleva ${progress.approved} de ${progress.total} documentos aprobados. Cada documento se aprueba al leerlo y rendir su examen.${
                nextDue ? ` La próxima lectura vence el ${formatDate(nextDue)}.` : ''
              }`
        }
        actions={<Button onClick={() => navigate('../induccion')}>{completed ? 'Ver mi inducción' : 'Continuar inducción'}</Button>}
      />

      <div className="my-progress">
        <section className="card my-progress__card">
          <header className="my-progress__header">
            <div>
              <h2>Su ruta de inducción</h2>
              <p>Las tres fases que recorre todo colaborador</p>
            </div>
            <span className="my-progress__tag">
              Fase {currentPhase} de {ONBOARDING_PHASES.length}
            </span>
          </header>
          <ol className="phases">
            {ONBOARDING_PHASES.map((phase) => {
              const state = phase.number < currentPhase ? 'done' : phase.number === currentPhase ? 'current' : 'next';
              return (
                <li key={phase.number} className={`phase phase--${state}`}>
                  <span className="phase__bar" />
                  <span className="phase__number">
                    Fase {phase.number}
                    {state === 'done' ? ' · completada' : state === 'current' ? ' · en curso' : ''}
                  </span>
                  <strong className="phase__name">{phase.name}</strong>
                  <span className="phase__detail">{phase.detail}</span>
                  <span className="phase__note">{phaseNotes[phase.number]}</span>
                </li>
              );
            })}
          </ol>
        </section>

        <section className="card my-progress__card">
          <header className="my-progress__header">
            <div>
              <h2>Su avance</h2>
              <p>
                {data.areaName}
                {data.startDate ? ` · inicio el ${formatDate(data.startDate)}` : ''}
              </p>
            </div>
            <span className="my-progress__tag">
              {progress.approved} de {progress.total} documentos aprobados
            </span>
          </header>
          <div className="my-progress__summary">
            <ProgressRing value={percent(progress.approved, progress.total)} label="aprobado" />
            <div className="my-progress__lines">
              <ProgressLine
                title="Documentos aprobados"
                detail={`${progress.approved} de ${progress.total} · lectura confirmada y examen aprobado`}
                value={percent(progress.approved, progress.total)}
                tone="success"
              />
              <ProgressLine
                title="Lecturas confirmadas"
                detail={`${progress.read} de ${progress.total}${progress.examsToTake ? ` · ${progress.examsToTake} examen(es) por rendir` : ''}`}
                value={percent(progress.read, progress.total)}
                tone="primary"
              />
              <ProgressLine
                title="Promedio de exámenes"
                detail={progress.averageScore === null ? 'Todavía no rindió exámenes' : 'Mínimo de aprobación 80%'}
                value={progress.averageScore ?? 0}
                tone="accent"
              />
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

interface ProgressLineProps {
  title: string;
  detail: string;
  value: number;
  tone: 'primary' | 'success' | 'accent';
}

function ProgressLine({ title, detail, value, tone }: ProgressLineProps) {
  return (
    <div className="progress-line">
      <div>
        <strong>{title}</strong>
        <small>{detail}</small>
      </div>
      <span className={`progress-line__bar progress-line__bar--${tone}`}>
        <span style={{ width: `${value}%` }} />
      </span>
      <span className="progress-line__value">{value}%</span>
    </div>
  );
}
