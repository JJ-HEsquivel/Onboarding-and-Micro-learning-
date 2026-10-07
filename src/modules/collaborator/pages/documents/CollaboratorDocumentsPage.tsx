import { useCallback, useState } from 'react';
import { Clock, FileX } from 'lucide-react';
import { useCurrentUser } from '@/app/session/useSession';
import { Alert } from '@/shared/components/Alert';
import { Button } from '@/shared/components/Button';
import { EmptyState } from '@/shared/components/EmptyState';
import { PageHeader } from '@/shared/components/PageHeader';
import { useAsync } from '@/shared/hooks/useAsync';
import { confirmReading, loadMyDocuments, type MyDocument } from '@/services/myDocuments.service';
import { MyStageDocuments } from './components/MyStageDocuments';
import { ReadingProgress } from './components/ReadingProgress';
import './CollaboratorDocumentsPage.css';

export default function CollaboratorDocumentsPage() {
  const user = useCurrentUser();
  const loadDocuments = useCallback(() => loadMyDocuments(user.id), [user.id]);
  const result = useAsync(loadDocuments);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const data = result.data;

  const handleConfirm = async (document: MyDocument) => {
    if (data?.state !== 'active') return;
    setConfirmingId(document.assignmentId);
    setActionError(null);
    try {
      await confirmReading(user.id, data.onboardingId, data.hasStarted, document);
      result.reload();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error));
    } finally {
      setConfirmingId(null);
    }
  };

  return (
    <>
      <PageHeader title="Mis documentos" description="Lea cada documento asignado y confirme su lectura." />

      <div className="my-documents">
        {result.error && (
          <Alert tone="danger">
            No se pudieron cargar sus documentos. {result.error.message}{' '}
            <Button variant="ghost" onClick={result.reload}>
              Reintentar
            </Button>
          </Alert>
        )}

        {actionError && (
          <Alert tone="danger" onDismiss={() => setActionError(null)}>
            No se pudo confirmar la lectura. {actionError}
          </Alert>
        )}

        {result.loading && !data && <p className="my-documents__loading">Cargando…</p>}

        {data?.state === 'noOnboarding' && (
          <section className="card">
            <EmptyState icon={FileX} title="Aún no tiene una inducción asignada" />
          </section>
        )}

        {data?.state === 'pendingValidation' && (
          <section className="card">
            <EmptyState
              icon={Clock}
              title="Su ruta de inducción todavía no está activa"
              description={`${data.validatorName ?? 'Su manager'} debe revisar y confirmar su documentación. Cuando lo haga, sus documentos aparecerán aquí.`}
            />
          </section>
        )}

        {data?.state === 'active' && (
          <>
            <ReadingProgress stages={data.stages} />
            {data.stages.map((stage) => (
              <MyStageDocuments
                key={stage.id}
                stage={stage}
                confirmingId={confirmingId}
                onConfirm={handleConfirm}
              />
            ))}
          </>
        )}
      </div>
    </>
  );
}
