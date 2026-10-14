import { CircleCheck, FileX } from 'lucide-react';
import { Alert } from '@/shared/components/Alert';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { DocumentItem } from '@/shared/components/DocumentItem';
import { EmptyState } from '@/shared/components/EmptyState';
import { PageHeader } from '@/shared/components/PageHeader';
import { formatDate, todayIso } from '@/shared/lib/dates';
import type { MyDocument } from '@/services/myInduction.service';
import { DocumentSteps } from '../../components/DocumentSteps';
import { PendingValidationView } from '../../components/PendingValidationView';
import { documentStatus } from '@/modules/common/documentStatus';
import { useDocumentDialogs } from '../../hooks/useDocumentDialogs';
import { useMyInduction } from '../../hooks/useMyInduction';
import '../../components/induction.css';
import './CollaboratorInductionPage.css';

export default function CollaboratorInductionPage() {
  const { user, data, error, loading, reload } = useMyInduction();
  const onboardingId = data && data.state !== 'noOnboarding' ? data.onboardingId : '';
  const { openReader, openExam, dialogs } = useDocumentDialogs({ personId: user.id, onboardingId, reload });

  if (loading && !data) return <p className="page-loading">Cargando su inducción…</p>;
  if (error && !data) return <Alert tone="danger">No se pudo cargar su inducción. {error.message}</Alert>;
  if (!data || data.state === 'noOnboarding') {
    return (
      <>
        <PageHeader title="Inducción" />
        <section className="card">
          <EmptyState icon={FileX} title="Aún no tiene una inducción asignada" />
        </section>
      </>
    );
  }
  if (data.state === 'pendingValidation') {
    return <PendingValidationView firstName={user.fullName.split(' ')[0]} validatorName={data.validatorName} proposed={data.proposed} />;
  }

  const today = todayIso();
  const documents = data.stages.flatMap((stage) => stage.documents);
  const toDo = documents.filter((d) => d.step !== 'approved');
  const approved = documents.filter((d) => d.step === 'approved');
  const toRead = toDo.filter((d) => !d.isRead);
  const readingMinutes = toRead.reduce((sum, d) => sum + (d.readingMinutes ?? 0), 0);

  const renderDocument = (document: MyDocument) => {
    const status = documentStatus(document, today);
    return (
      <li key={document.assignmentId}>
        <DocumentItem
          document={document}
          extraMeta={
            <>
              <span>{document.stageName.split(' · ')[0]}</span>
              <span>
                {document.isRead
                  ? `Lectura confirmada el ${formatDate(document.confirmedOn)}`
                  : document.dueDate
                    ? `Vence ${formatDate(document.dueDate)}`
                    : ''}
              </span>
              <DocumentSteps step={document.step} isRead={document.isRead} />
            </>
          }
          actions={
            <>
              <Badge tone={status.tone}>{status.label}</Badge>
              <DocumentAction document={document} onRead={openReader} onExam={openExam} />
            </>
          }
        />
      </li>
    );
  };

  return (
    <>
      <PageHeader
        title="Inducción"
        description="Lea cada documento, confirme la lectura y rinda su examen: el documento suma al aprobarlo."
      />

      <div className="induction">
        <section className="card induction__section">
          <header className="induction__header">
            <div>
              <h2>Por completar</h2>
              <p>
                {toRead.length} por leer · {toDo.length - toRead.length} con examen por rendir · el documento suma recién al
                aprobar su examen
              </p>
            </div>
            {readingMinutes > 0 && <Badge>{readingMinutes} min de lectura</Badge>}
          </header>
          {toDo.length > 0 ? (
            <ul className="stage-group__items">{toDo.map(renderDocument)}</ul>
          ) : (
            <EmptyState icon={CircleCheck} title="Aprobó todos sus documentos" description="Le avisaremos cuando se publique una nueva versión." />
          )}
        </section>

        <section className="card induction__section">
          <header className="induction__header">
            <div>
              <h2>
                Aprobados ({approved.length} de {documents.length})
              </h2>
              <p>Lectura confirmada y examen aprobado · queda registrado como evidencia</p>
            </div>
          </header>
          {approved.length > 0 ? (
            <ul className="stage-group__items">{approved.map(renderDocument)}</ul>
          ) : (
            <p className="induction__empty">Todavía no aprueba ningún documento. Lea un documento y rinda su examen para sumar el primero.</p>
          )}
        </section>
      </div>

      {dialogs}
    </>
  );
}

interface DocumentActionProps {
  document: MyDocument;
  onRead: (document: MyDocument) => void;
  onExam: (document: MyDocument) => void;
}

/** Siguiente acción de un documento: leer → rendir su examen → releer. */
function DocumentAction({ document, onRead, onExam }: DocumentActionProps) {
  switch (document.step) {
    case 'read':
      return <Button onClick={() => onRead(document)}>Leer y confirmar</Button>;
    case 'exam':
      return (
        <Button onClick={() => onExam(document)}>
          {document.exam?.status === 'failed' ? 'Reintentar examen' : 'Rendir examen'}
        </Button>
      );
    case 'exhausted':
      return (
        <Button variant="secondary" disabled title="Su Manager puede habilitarle un nuevo intento">
          Intentos agotados
        </Button>
      );
    default:
      return (
        <Button variant="secondary" onClick={() => onRead(document)}>
          Releer
        </Button>
      );
  }
}
