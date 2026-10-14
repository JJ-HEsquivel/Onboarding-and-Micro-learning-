import { Badge } from '@/shared/components/Badge';
import { DocumentItem } from '@/shared/components/DocumentItem';
import { StageGroup } from '@/shared/components/StageGroup';
import { pluralize } from '@/shared/lib/format';
import type { RouteStage } from '@/shared/types/onboarding';

interface ProposedRouteProps {
  /** Todas las etapas y documentos del área. */
  stages: RouteStage[];
  /** Documentos que se le asignan al registrarlo. */
  proposedIds: Set<string>;
  loading: boolean;
}

/** Ruta propuesta por etapa: obligatorios, "por defecto" y opcionales que decide el Manager. */
export function ProposedRoute({ stages, proposedIds, loading }: ProposedRouteProps) {
  return (
    <section className="proposed-route">
      <h3 className="section-label">
        Ruta propuesta por etapa
        {!loading && stages.length > 0 && <> ({pluralize(proposedIds.size, 'documento', 'documentos')} · el Manager la revisará antes de activarla)</>}
      </h3>

      {loading && <p className="proposed-route__empty">Cargando la ruta de inducción…</p>}

      {!loading && stages.length === 0 && (
        <p className="proposed-route__empty">El área seleccionada no tiene documentos configurados en su ruta.</p>
      )}

      {stages.map((stage) => {
        const proposedInStage = stage.documents.filter((d) => proposedIds.has(d.id)).length;
        return (
          <StageGroup
            key={stage.id}
            name={stage.name}
            summary={
              stage.isGeneral
                ? `${pluralize(stage.documents.length, 'documento', 'documentos')} · obligatoria para todos`
                : `${proposedInStage} de ${stage.documents.length} documentos del área · el Manager puede quitar o sumar`
            }
          >
            {stage.documents.map((document) => {
              const isProposed = proposedIds.has(document.id);
              return (
                <li key={document.id}>
                  <DocumentItem
                    document={document}
                    muted={!isProposed}
                    actions={
                      stage.isGeneral ? (
                        <Badge tone="info">Obligatorio</Badge>
                      ) : isProposed ? (
                        <Badge tone="success">Por defecto</Badge>
                      ) : (
                        <Badge>Opcional · decide el Manager</Badge>
                      )
                    }
                  />
                </li>
              );
            })}
          </StageGroup>
        );
      })}
    </section>
  );
}
