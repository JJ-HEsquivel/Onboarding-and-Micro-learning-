import { useCallback, useState } from 'react';
import { CircleCheck } from 'lucide-react';
import { useCurrentUser } from '@/app/session/useSession';
import { Alert } from '@/shared/components/Alert';
import { Button } from '@/shared/components/Button';
import { EmptyState } from '@/shared/components/EmptyState';
import { PageHeader } from '@/shared/components/PageHeader';
import { useAsync } from '@/shared/hooks/useAsync';
import { loadPendingValidations } from '@/services/validation.service';
import { PendingValidationCard } from './components/PendingValidationCard';
import './ManagerPendingValidationPage.css';

export default function ManagerPendingValidationPage() {
  const manager = useCurrentUser();
  const loadPending = useCallback(() => loadPendingValidations(manager.id), [manager.id]);
  const overview = useAsync(loadPending);
  const [notice, setNotice] = useState<string | null>(null);

  const handleConfirmed = (fullName: string) => {
    setNotice(`Ruta de ${fullName} activada. Ya puede ver su documentación.`);
    overview.reload();
  };

  return (
    <>
      <PageHeader
        title="Nuevos colaboradores por validar"
        description="Revise, ajuste y confirme la documentación antes de activar la ruta y avisar al colaborador."
      />

      <div className="pending-validation">
        {notice && (
          <Alert tone="success" onDismiss={() => setNotice(null)}>
            {notice}
          </Alert>
        )}

        {overview.error && (
          <Alert tone="danger">
            No se pudieron cargar los colaboradores por validar. {overview.error.message}{' '}
            <Button variant="ghost" onClick={overview.reload}>
              Reintentar
            </Button>
          </Alert>
        )}

        {overview.loading && !overview.data && <p className="pending-validation__loading">Cargando…</p>}

        {overview.data && overview.data.pending.length === 0 && (
          <section className="card">
            <EmptyState
              icon={CircleCheck}
              title="No tiene colaboradores pendientes de validación"
              description="Los nuevos registros que le asigne el Administrador aparecerán aquí antes de activarse."
            />
          </section>
        )}

        {overview.data?.pending.map((pending) => (
          <PendingValidationCard
            key={pending.onboardingId}
            pending={pending}
            catalog={overview.data!.catalog}
            onConfirmed={handleConfirmed}
          />
        ))}
      </div>
    </>
  );
}
