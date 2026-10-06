import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Alert } from '@/shared/components/Alert';
import { Button } from '@/shared/components/Button';
import { PageHeader } from '@/shared/components/PageHeader';
import { useAsync } from '@/shared/hooks/useAsync';
import { loadCollaboratorsOverview } from '@/services/collaborators.service';
import { CollaboratorStats } from './components/CollaboratorStats';
import { CollaboratorsTable } from './components/CollaboratorsTable';
import { CollaboratorsToolbar } from './components/CollaboratorsToolbar';
import { RegisterCollaboratorModal } from './components/RegisterCollaboratorModal';
import { EMPTY_FILTERS, exportCollaboratorsCsv, filterCollaborators } from './collaboratorFilters';
import './AdminCollaboratorsPage.css';

export default function AdminCollaboratorsPage() {
  const overview = useAsync(loadCollaboratorsOverview);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const collaborators = useMemo(() => overview.data?.collaborators ?? [], [overview.data]);
  const visibleCollaborators = useMemo(() => filterCollaborators(collaborators, filters), [collaborators, filters]);

  const openRegister = () => setIsRegisterOpen(true);

  const handleRegistered = (fullName: string) => {
    setIsRegisterOpen(false);
    setNotice(`${fullName} fue registrado. Queda pendiente de validación por su manager.`);
    overview.reload();
  };

  return (
    <>
      <PageHeader
        title="Colaboradores"
        description="Seguimiento individual del avance, cumplimiento y riesgo de cada colaborador."
        actions={
          <Button onClick={openRegister} disabled={!overview.data}>
            <Plus size={18} />
            Registrar colaborador
          </Button>
        }
      />

      <div className="collaborators-page">
        {notice && (
          <Alert tone="success" onDismiss={() => setNotice(null)}>
            {notice}
          </Alert>
        )}

        {overview.error && (
          <Alert tone="danger">
            No se pudieron cargar los colaboradores. {overview.error.message}{' '}
            <Button variant="ghost" onClick={overview.reload}>
              Reintentar
            </Button>
          </Alert>
        )}

        <CollaboratorStats collaborators={collaborators} />

        <section className="card">
          <CollaboratorsToolbar
            filters={filters}
            areas={overview.data?.areas ?? []}
            resultCount={visibleCollaborators.length}
            onChange={setFilters}
            onExport={() => exportCollaboratorsCsv(visibleCollaborators)}
          />
          <CollaboratorsTable
            collaborators={visibleCollaborators}
            loading={overview.loading && !overview.data}
            hasCollaborators={collaborators.length > 0}
            onRegister={openRegister}
          />
        </section>
      </div>

      {isRegisterOpen && overview.data && (
        <RegisterCollaboratorModal
          areas={overview.data.areas}
          managers={overview.data.managers}
          onClose={() => setIsRegisterOpen(false)}
          onRegistered={handleRegistered}
        />
      )}
    </>
  );
}
