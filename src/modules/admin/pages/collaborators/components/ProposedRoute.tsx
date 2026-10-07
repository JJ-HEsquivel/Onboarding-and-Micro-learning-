import { Badge } from '@/shared/components/Badge';
import { DocumentItem } from '@/shared/components/DocumentItem';
import { StageGroup } from '@/shared/components/StageGroup';
import { pluralize } from '@/shared/lib/format';
import type { RouteStage } from '@/shared/types/onboarding';

interface ProposedRouteProps {
  stages: RouteStage[];
  loading: boolean;
}

/** Lista de etapas y documentos que se asignarán al colaborador según su área. */
export function ProposedRoute({ stages, loading }: ProposedRouteProps) {
  const totalDocuments = stages.reduce((sum, stage) => sum + stage.documents.length, 0);

  return (
    <section className="proposed-route">
      <h3 className="proposed-route__title">
        Ruta propuesta según el área
        {!loading && stages.length > 0 && (
          <>
            {' '}
            ({pluralize(totalDocuments, 'documento', 'documentos')} en {pluralize(stages.length, 'etapa', 'etapas')} · el
            Manager la revisará antes de activarla)
          </>
        )}
      </h3>

      {loading && <p className="proposed-route__empty">Cargando la ruta de inducción…</p>}

      {!loading && stages.length === 0 && (
        <p className="proposed-route__empty">El área seleccionada no tiene documentos configurados en su ruta.</p>
      )}

      {stages.map((stage) => (
        <StageGroup key={stage.id} name={stage.name} summary={pluralize(stage.documents.length, 'documento', 'documentos')}>
          {stage.documents.map((document) => (
            <li key={document.id}>
              <DocumentItem document={document} actions={<Badge tone="info">Propuesto</Badge>} />
            </li>
          ))}
        </StageGroup>
      ))}
    </section>
  );
}
