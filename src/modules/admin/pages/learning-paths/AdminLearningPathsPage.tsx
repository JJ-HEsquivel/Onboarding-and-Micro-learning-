import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Alert } from '@/shared/components/Alert';
import { Button } from '@/shared/components/Button';
import { PageHeader } from '@/shared/components/PageHeader';
import { StatCard } from '@/shared/components/StatCard';
import { useAsync } from '@/shared/hooks/useAsync';
import type { Stage } from '@/shared/types/content';
import { listAreas } from '@/services/areas.service';
import { setDocumentDefault } from '@/services/documentCatalog.service';
import { loadOnboardingCatalog } from '@/services/onboardingRoute.service';
import { listStages } from '@/services/stages.service';
import { AreaRoutePreview } from './components/AreaRoutePreview';
import { StageFormModal } from './components/StageFormModal';
import { StagesTable } from './components/StagesTable';
import '@/modules/admin/content/content.css';

type Dialog = { kind: 'create' } | { kind: 'edit'; stage: Stage } | null;

async function loadLearningPathsPage() {
  const [stages, areas, catalog] = await Promise.all([listStages(), listAreas(), loadOnboardingCatalog()]);
  return { stages, areas, catalog };
}

/** Etapas del programa y la ruta que se propone a cada área. */
export default function AdminLearningPathsPage() {
  const page = useAsync(loadLearningPathsPage);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [savingDocumentId, setSavingDocumentId] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);
  // Cambios de "propuesto por defecto" ya guardados: se muestran sin volver a leer todo el catálogo.
  const [defaultOverrides, setDefaultOverrides] = useState<Record<string, boolean>>({});

  const data = page.data;
  const areaId = selectedArea ?? data?.areas[0]?.id ?? '';

  const catalog = useMemo(
    () =>
      data && {
        ...data.catalog,
        documents: data.catalog.documents.map((item) =>
          item.document.id in defaultOverrides
            ? { ...item, document: { ...item.document, isDefault: defaultOverrides[item.document.id] } }
            : item,
        ),
      },
    [data, defaultOverrides],
  );

  const documentCount = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of data?.catalog.documents ?? []) counts.set(item.stageId, (counts.get(item.stageId) ?? 0) + 1);
    return counts;
  }, [data]);

  const close = () => setDialog(null);
  const done = (message: string) => {
    close();
    setNotice(message);
    page.reload();
  };

  const handleToggleDefault = async (documentId: string, isDefault: boolean) => {
    setSavingDocumentId(documentId);
    setToggleError(null);
    // Actualización optimista: se ve al instante y se revierte si el guardado falla.
    setDefaultOverrides((prev) => ({ ...prev, [documentId]: isDefault }));
    try {
      await setDocumentDefault(documentId, isDefault);
    } catch (error) {
      // Se descarta el cambio: vuelve a mostrarse el valor guardado en Dataverse.
      setDefaultOverrides((prev) => {
        const next = { ...prev };
        delete next[documentId];
        return next;
      });
      setToggleError(error instanceof Error ? error.message : String(error));
    } finally {
      setSavingDocumentId(null);
    }
  };

  const generalStages = data?.stages.filter((s) => s.isGeneral).length ?? 0;
  const areasWithoutStage = data?.areas.filter((a) => !data.stages.some((s) => !s.isGeneral && s.areaIds.includes(a.id))).length ?? 0;
  const nextOrder = Math.max(0, ...(data?.stages.map((s) => s.order) ?? [])) + 1;

  return (
    <>
      <PageHeader
        title="Rutas de aprendizaje"
        description="Las etapas del programa y la ruta que se propone a cada área al registrar a un colaborador."
        actions={
          <Button onClick={() => setDialog({ kind: 'create' })} disabled={!data}>
            <Plus size={16} />
            Nueva etapa
          </Button>
        }
      />

      <div className="content-page">
        {notice && (
          <Alert tone="success" onDismiss={() => setNotice(null)}>
            {notice}
          </Alert>
        )}
        {page.error && (
          <Alert tone="danger">
            No se pudieron cargar las rutas. {page.error.message}{' '}
            <Button variant="ghost" onClick={page.reload}>
              Reintentar
            </Button>
          </Alert>
        )}
        {page.loading && !data && <p className="page-loading">Cargando rutas…</p>}

        {data && (
          <>
            <div className="content-page__stats">
              <StatCard label="Etapas" value={data.stages.length} caption={`${generalStages} generales · ${data.stages.length - generalStages} por área`} />
              <StatCard label="Documentos publicados" value={data.catalog.documents.length} caption="Los borradores no entran en las rutas" />
              <StatCard label="Áreas" value={data.areas.length} caption="Cada una con su ruta" />
              <StatCard label="Áreas sin etapa propia" value={areasWithoutStage} caption="Solo reciben las etapas generales" />
            </div>

            <section className="card">
              <header className="content-page__header">
                <div>
                  <h2>Etapas del programa</h2>
                  <p>Las etapas no se eliminan: sus documentos y las rutas ya asignadas las usan.</p>
                </div>
              </header>
              <StagesTable
                stages={data.stages}
                areas={data.areas}
                documentCount={documentCount}
                onEdit={(stage) => setDialog({ kind: 'edit', stage })}
              />
            </section>

            <section className="card">
              <header className="content-page__header">
                <div>
                  <h2>Ruta propuesta por área</h2>
                  <p>
                    Lo que verá el Administrador al registrar a alguien del área. En la etapa por área, marque los documentos que se
                    proponen por defecto; el Manager puede sumar o quitar al validar.
                  </p>
                </div>
              </header>
              {toggleError && (
                <div className="content-toolbar">
                  <Alert tone="danger" onDismiss={() => setToggleError(null)}>
                    No se pudo guardar la propuesta. {toggleError}
                  </Alert>
                </div>
              )}
              <AreaRoutePreview
                catalog={catalog ?? data.catalog}
                areas={data.areas}
                areaId={areaId}
                onAreaChange={setSelectedArea}
                savingDocumentId={savingDocumentId}
                onToggleDefault={handleToggleDefault}
              />
            </section>
          </>
        )}
      </div>

      {data && dialog && (
        <StageFormModal
          stage={dialog.kind === 'edit' ? dialog.stage : undefined}
          areas={data.areas}
          nextOrder={nextOrder}
          onClose={close}
          onSaved={done}
        />
      )}
    </>
  );
}
