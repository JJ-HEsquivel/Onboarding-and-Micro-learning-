import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Alert } from '@/shared/components/Alert';
import { Button } from '@/shared/components/Button';
import { PageHeader } from '@/shared/components/PageHeader';
import { StatCard } from '@/shared/components/StatCard';
import { useAsync } from '@/shared/hooks/useAsync';
import { normalizeText, pluralize } from '@/shared/lib/format';
import type { ManagedDocument } from '@/shared/types/content';
import { loadAssessmentStats } from '@/services/assessmentEditor.service';
import { listManagedDocuments } from '@/services/documentCatalog.service';
import { listStages } from '@/services/stages.service';
import { AssessmentEditorModal } from './components/AssessmentEditorModal';
import { AssessmentsTable } from './components/AssessmentsTable';
import '@/modules/admin/content/content.css';

async function loadAssessmentsPage() {
  const [documents, stages, stats] = await Promise.all([listManagedDocuments(), listStages(), loadAssessmentStats()]);
  return { documents, stages, stats };
}

/** Evaluaciones de los documentos: configuración, preguntas y resultados. */
export default function AdminAssessmentsPage() {
  const page = useAsync(loadAssessmentsPage);
  const [editing, setEditing] = useState<ManagedDocument | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [onlyPending, setOnlyPending] = useState(false);
  // "?documento=<id>" abre el editor de ese documento (viene desde la pantalla Documentos).
  const [searchParams, setSearchParams] = useSearchParams();
  const documentParam = searchParams.get('documento');

  const data = page.data;
  const linked = documentParam ? data?.documents.find((d) => d.id === documentParam) : undefined;
  const open = editing ?? linked ?? null;

  const visible = useMemo(() => {
    if (!data) return [];
    const query = normalizeText(search.trim());
    return data.documents.filter(
      (d) =>
        (!query || normalizeText(`${d.title} ${d.code}`).includes(query)) &&
        (!stageFilter || d.stageId === stageFilter) &&
        (!onlyPending || d.questionCount === 0),
    );
  }, [data, search, stageFilter, onlyPending]);

  const close = () => {
    setEditing(null);
    if (documentParam) setSearchParams({}, { replace: true });
  };
  const done = (message: string) => {
    close();
    setNotice(message);
    page.reload();
  };

  const ready = data?.documents.filter((d) => d.questionCount > 0).length ?? 0;
  const totalQuestions = data?.documents.reduce((sum, d) => sum + d.questionCount, 0) ?? 0;
  const pending = data?.documents.filter((d) => d.status !== 'draft' && d.questionCount === 0).length ?? 0;
  const allStats = data ? [...data.stats.values()] : [];
  const attempts = allStats.reduce((sum, s) => sum + s.attempts, 0);
  const passed = allStats.reduce((sum, s) => sum + s.passed, 0);

  return (
    <>
      <PageHeader
        title="Evaluaciones"
        description="El examen de cada documento: nota mínima, intentos, preguntas y cómo les va a los colaboradores."
      />

      <div className="content-page">
        {notice && (
          <Alert tone="success" onDismiss={() => setNotice(null)}>
            {notice}
          </Alert>
        )}
        {page.error && (
          <Alert tone="danger">
            No se pudieron cargar las evaluaciones. {page.error.message}{' '}
            <Button variant="ghost" onClick={page.reload}>
              Reintentar
            </Button>
          </Alert>
        )}
        {page.loading && !data && <p className="page-loading">Cargando evaluaciones…</p>}

        {data && (
          <>
            <div className="content-page__stats">
              <StatCard label="Evaluaciones listas" value={ready} caption={`de ${pluralize(data.documents.length, 'documento', 'documentos')}`} />
              <StatCard label="Preguntas activas" value={totalQuestions} caption="Las archivadas no se cuentan" />
              <StatCard label="Pendientes" value={pending} caption="Documentos publicados sin preguntas" />
              <StatCard
                label="Aprobación global"
                value={attempts ? `${Math.round((passed / attempts) * 100)} %` : '—'}
                caption={pluralize(attempts, 'intento rendido', 'intentos rendidos')}
              />
            </div>

            <Alert tone="warning">
              Las preguntas que alguien ya respondió no se modifican: al editarlas o quitarlas se <strong>archivan</strong> y, si
              corresponde, se crea una nueva. Así cada respuesta guardada sigue mostrando exactamente lo que se preguntó.
            </Alert>

            <section className="card">
              <header className="content-page__header">
                <div>
                  <h2>Evaluaciones por documento</h2>
                  <p>Cada documento tiene un examen; se habilita al confirmar su lectura.</p>
                </div>
              </header>

              <div className="content-toolbar">
                <input
                  type="search"
                  className="input content-toolbar__search"
                  placeholder="Buscar por título o código"
                  aria-label="Buscar evaluaciones"
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
                <label className="content-form__inline" htmlFor="only-pending">
                  <input
                    id="only-pending"
                    type="checkbox"
                    className="doc-item__check"
                    checked={onlyPending}
                    onChange={(e) => setOnlyPending(e.target.checked)}
                  />
                  Solo sin preguntas
                </label>
                <span className="content-toolbar__count">{pluralize(visible.length, 'documento', 'documentos')}</span>
              </div>

              {visible.length === 0 ? (
                <p className="content-page__empty">Ningún documento coincide con los filtros.</p>
              ) : (
                <AssessmentsTable documents={visible} stages={data.stages} stats={data.stats} onEdit={setEditing} />
              )}
            </section>
          </>
        )}
      </div>

      {data && open && <AssessmentEditorModal document={open} stats={data.stats.get(open.id)} onClose={close} onSaved={done} />}
    </>
  );
}
