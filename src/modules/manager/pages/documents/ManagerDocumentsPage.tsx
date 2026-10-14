import { useMemo, useState } from 'react';
import { Eye } from 'lucide-react';
import { Alert } from '@/shared/components/Alert';
import { Button } from '@/shared/components/Button';
import { DocumentItem } from '@/shared/components/DocumentItem';
import { Modal } from '@/shared/components/Modal';
import { PageHeader } from '@/shared/components/PageHeader';
import { StageGroup } from '@/shared/components/StageGroup';
import { useAsync } from '@/shared/hooks/useAsync';
import { normalizeText as normalize, pluralize } from '@/shared/lib/format';
import type { RouteDocument } from '@/shared/types/onboarding';
import { buildFullCatalog, loadOnboardingCatalog } from '@/services/onboardingRoute.service';
import { DocumentContent } from '@/modules/common/components/DocumentContent';
import '../manager.css';

/** Documentos del programa para el Manager: solo ver su contenido (no confirma lectura ni rinde exámenes). */
export default function ManagerDocumentsPage() {
  const catalog = useAsync(loadOnboardingCatalog);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<RouteDocument | null>(null);

  const stages = useMemo(() => {
    if (!catalog.data) return [];
    const query = normalize(search.trim());
    return buildFullCatalog(catalog.data)
      .map((stage) => ({
        ...stage,
        documents: stage.documents.filter((d) => !query || normalize(`${d.title} ${d.code}`).includes(query)),
      }))
      .filter((stage) => stage.documents.length > 0);
  }, [catalog.data, search]);

  const total = catalog.data?.documents.length ?? 0;

  return (
    <>
      <PageHeader
        title="Documentos"
        description="Consulte el contenido de cada documento del programa. Solo lectura: no se confirma lectura ni se rinden exámenes."
      />

      <div className="manager-page">
        {catalog.error && <Alert tone="danger">No se pudieron cargar los documentos. {catalog.error.message}</Alert>}
        {catalog.loading && !catalog.data && <p className="page-loading">Cargando documentos…</p>}

        {catalog.data && (
          <section className="card">
            <div className="manager-page__toolbar">
              <input
                type="search"
                className="input"
                placeholder="Buscar por título o código"
                aria-label="Buscar por título o código"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <span className="manager-page__count">{pluralize(total, 'documento', 'documentos')} · solo lectura</span>
            </div>
            <div className="manager-page__panel">
              {stages.length === 0 && <p className="manager-page__empty">Ningún documento coincide con la búsqueda.</p>}
              {stages.map((stage) => (
                <StageGroup key={stage.id} name={stage.name} summary={pluralize(stage.documents.length, 'documento', 'documentos')}>
                  {stage.documents.map((document) => (
                    <li key={document.id}>
                      <DocumentItem
                        document={document}
                        actions={
                          <Button variant="secondary" onClick={() => setOpen(document)}>
                            <Eye size={16} />
                            Ver contenido
                          </Button>
                        }
                      />
                    </li>
                  ))}
                </StageGroup>
              ))}
            </div>
          </section>
        )}
      </div>

      {open && (
        <Modal
          title={open.title}
          description={`${open.code} · versión ${open.version}`}
          onClose={() => setOpen(null)}
          footer={<Button onClick={() => setOpen(null)}>Cerrar</Button>}
        >
          <DocumentContent documentId={open.id} />
        </Modal>
      )}
    </>
  );
}
