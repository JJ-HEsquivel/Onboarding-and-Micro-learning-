import { useMemo, useState } from 'react';
import { FileText, Plus } from 'lucide-react';
import { Alert } from '@/shared/components/Alert';
import { Button } from '@/shared/components/Button';
import { EmptyState } from '@/shared/components/EmptyState';
import { PageHeader } from '@/shared/components/PageHeader';
import { StatCard } from '@/shared/components/StatCard';
import { useAsync } from '@/shared/hooks/useAsync';
import { normalizeText, pluralize } from '@/shared/lib/format';
import type { DocumentStatus, ManagedDocument } from '@/shared/types/content';
import { listAreas } from '@/services/areas.service';
import { listCategories, listManagedDocuments } from '@/services/documentCatalog.service';
import { listStages } from '@/services/stages.service';
import { DOCUMENT_STATUS_LABEL } from '@/modules/admin/content/contentLabels';
import { DocumentFormModal } from './components/DocumentFormModal';
import { DocumentsTable } from './components/DocumentsTable';
import { NewVersionModal } from './components/NewVersionModal';
import { VersionHistoryDrawer } from './components/VersionHistoryDrawer';
import '@/modules/admin/content/content.css';

type Dialog =
  | { kind: 'create' }
  | { kind: 'edit'; document: ManagedDocument }
  | { kind: 'version'; document: ManagedDocument }
  | { kind: 'history'; document: ManagedDocument }
  | null;

/** Todo lo que necesita la pantalla, leído en paralelo. */
async function loadDocumentsPage() {
  const [documents, stages, categories, areas] = await Promise.all([
    listManagedDocuments(),
    listStages(),
    listCategories(),
    listAreas(),
  ]);
  return { documents, stages, categories, areas };
}

/** Repositorio de documentos: alta, edición, versiones y su historial. */
export default function AdminDocumentsPage() {
  const page = useAsync(loadDocumentsPage);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | ''>('');

  const data = page.data;

  const visible = useMemo(() => {
    if (!data) return [];
    const query = normalizeText(search.trim());
    return data.documents.filter(
      (d) =>
        (!query || normalizeText(`${d.title} ${d.code} ${d.owner}`).includes(query)) &&
        (!stageFilter || d.stageId === stageFilter) &&
        (!statusFilter || d.status === statusFilter),
    );
  }, [data, search, stageFilter, statusFilter]);

  const close = () => setDialog(null);
  const done = (message: string) => {
    close();
    setNotice(message);
    page.reload();
  };

  const countBy = (status: DocumentStatus) => data?.documents.filter((d) => d.status === status).length ?? 0;
  const withoutQuestions = data?.documents.filter((d) => d.status !== 'draft' && d.questionCount === 0).length ?? 0;

  return (
    <>
      <PageHeader
        title="Documentos"
        description="Repositorio de documentos controlados del programa: su contenido, versiones y a quién aplican."
        actions={
          <Button onClick={() => setDialog({ kind: 'create' })} disabled={!data}>
            <Plus size={16} />
            Nuevo documento
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
            No se pudieron cargar los documentos. {page.error.message}{' '}
            <Button variant="ghost" onClick={page.reload}>
              Reintentar
            </Button>
          </Alert>
        )}
        {page.loading && !data && <p className="page-loading">Cargando documentos…</p>}

        {data && (
          <>
            <div className="content-page__stats">
              <StatCard label="Documentos" value={data.documents.length} caption={`${countBy('draft')} en borrador`} />
              <StatCard label="Vigentes" value={countBy('current')} caption="Sin cambios desde su publicación" />
              <StatCard label="Actualizados" value={countBy('updated')} caption="Con una versión nueva publicada" />
              <StatCard label="Sin preguntas" value={withoutQuestions} caption="Publicados sin evaluación lista" />
            </div>

            <section className="card">
              <header className="content-page__header">
                <div>
                  <h2>Repositorio</h2>
                  <p>Los borradores no se asignan a nadie. Use «Versión» para publicar un cambio que deban conocer los colaboradores.</p>
                </div>
              </header>

              <div className="content-toolbar">
                <input
                  type="search"
                  className="input content-toolbar__search"
                  placeholder="Buscar por título, código o área responsable"
                  aria-label="Buscar documentos"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <select className="input" aria-label="Filtrar por etapa" value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
                  <option value="">Todas las etapas</option>
                  {data.stages.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name}
                    </option>
                  ))}
                </select>
                <select
                  className="input"
                  aria-label="Filtrar por estado"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as DocumentStatus | '')}
                >
                  <option value="">Todos los estados</option>
                  {(Object.keys(DOCUMENT_STATUS_LABEL) as DocumentStatus[]).map((status) => (
                    <option key={status} value={status}>
                      {DOCUMENT_STATUS_LABEL[status].label}
                    </option>
                  ))}
                </select>
                <span className="content-toolbar__count">{pluralize(visible.length, 'documento', 'documentos')}</span>
              </div>

              {data.documents.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="Todavía no hay documentos"
                  description="Cree el primero o cárguelos con el script de datos iniciales (npm run seed)."
                />
              ) : visible.length === 0 ? (
                <p className="content-page__empty">Ningún documento coincide con los filtros.</p>
              ) : (
                <DocumentsTable
                  documents={visible}
                  stages={data.stages}
                  categories={data.categories}
                  onEdit={(document) => setDialog({ kind: 'edit', document })}
                  onNewVersion={(document) => setDialog({ kind: 'version', document })}
                  onHistory={(document) => setDialog({ kind: 'history', document })}
                />
              )}
            </section>
          </>
        )}
      </div>

      {data && (dialog?.kind === 'create' || dialog?.kind === 'edit') && (
        <DocumentFormModal
          document={dialog.kind === 'edit' ? dialog.document : undefined}
          stages={data.stages}
          categories={data.categories}
          areas={data.areas}
          onClose={close}
          onSaved={done}
        />
      )}
      {dialog?.kind === 'version' && <NewVersionModal document={dialog.document} onClose={close} onPublished={done} />}
      {dialog?.kind === 'history' && <VersionHistoryDrawer document={dialog.document} onClose={close} />}
    </>
  );
}
