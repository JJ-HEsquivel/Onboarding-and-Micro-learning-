import { FileText } from 'lucide-react';
import { Badge } from '@/shared/components/Badge';
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
        <div key={stage.id} className="route-stage">
          <div className="route-stage__header">
            <p className="route-stage__name">{stage.name}</p>
            <span className="route-stage__count">{pluralize(stage.documents.length, 'documento', 'documentos')}</span>
          </div>

          <ul className="route-stage__documents">
            {stage.documents.map((document) => (
              <li key={document.id} className="route-document">
                <span className={`route-document__icon${document.isCritical ? ' route-document__icon--critical' : ''}`}>
                  <FileText size={16} />
                  {document.isCritical && <span className="visually-hidden">Criticidad alta</span>}
                </span>
                <div className="route-document__info">
                  <p className="route-document__title">{document.title}</p>
                  <p className="route-document__meta">
                    <span>{document.code}</span>
                    <span>v{document.version}</span>
                    {document.readingMinutes !== null && <span>{document.readingMinutes} min</span>}
                  </p>
                </div>
                <Badge tone="info">Propuesto</Badge>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
