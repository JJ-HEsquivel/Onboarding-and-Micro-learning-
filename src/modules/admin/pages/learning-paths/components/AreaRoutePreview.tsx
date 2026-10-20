import { useMemo } from 'react';
import { Route } from 'lucide-react';
import { Badge } from '@/shared/components/Badge';
import { DocumentItem } from '@/shared/components/DocumentItem';
import { EmptyState } from '@/shared/components/EmptyState';
import { StageGroup } from '@/shared/components/StageGroup';
import { pluralize } from '@/shared/lib/format';
import type { Area } from '@/shared/types/onboarding';
import { buildAreaRoute, proposedDocumentIds, type OnboardingCatalog } from '@/services/onboardingRoute.service';

interface AreaRoutePreviewProps {
  catalog: OnboardingCatalog;
  areas: Area[];
  areaId: string;
  onAreaChange: (areaId: string) => void;
  /** Documento cuya propuesta se está guardando (sus casillas se bloquean). */
  savingDocumentId: string | null;
  onToggleDefault: (documentId: string, isDefault: boolean) => void;
}

/**
 * La ruta que se le propone a alguien nuevo de un área: las etapas generales completas y,
 * en su etapa por área, los documentos marcados como "por defecto".
 */
export function AreaRoutePreview({ catalog, areas, areaId, onAreaChange, savingDocumentId, onToggleDefault }: AreaRoutePreviewProps) {
  const route = useMemo(() => buildAreaRoute(catalog, areaId), [catalog, areaId]);
  const proposed = useMemo(() => proposedDocumentIds(route), [route]);

  const proposedDocuments = route.flatMap((stage) => stage.documents).filter((d) => proposed.has(d.id));
  const minutes = proposedDocuments.reduce((sum, d) => sum + (d.readingMinutes ?? 0), 0);
  const businessDays = route.reduce((sum, stage) => sum + (stage.businessDays ?? 0), 0);

  return (
    <>
      <div className="content-toolbar">
        <select className="input" aria-label="Área" value={areaId} onChange={(e) => onAreaChange(e.target.value)}>
          {areas.map((area) => (
            <option key={area.id} value={area.id}>
              {area.name}
            </option>
          ))}
        </select>
        <span className="content-toolbar__count">
          {pluralize(proposedDocuments.length, 'documento propuesto', 'documentos propuestos')} · {minutes} min de lectura ·{' '}
          {businessDays} días hábiles en total
        </span>
      </div>

      {route.length === 0 ? (
        <EmptyState icon={Route} title="Esta área no tiene documentos" description="Asígnele una etapa por área y publique documentos en ella." />
      ) : (
        <div className="route-preview">
          {route.map((stage) => (
            <StageGroup
              key={stage.id}
              name={stage.name}
              summary={`${stage.businessDays === null ? 'Sin plazo' : `${stage.businessDays} días hábiles`} · ${pluralize(stage.documents.length, 'documento', 'documentos')}`}
            >
              {stage.documents.map((document) => {
                const checkboxId = `default-${document.id}`;
                return (
                  <li key={document.id}>
                    {stage.isGeneral ? (
                      <DocumentItem document={document} actions={<Badge tone="info">Obligatorio</Badge>} />
                    ) : (
                      <DocumentItem
                        document={document}
                        htmlFor={checkboxId}
                        muted={!document.isDefault}
                        leading={
                          <input
                            id={checkboxId}
                            type="checkbox"
                            className="doc-item__check"
                            checked={document.isDefault}
                            disabled={savingDocumentId !== null}
                            onChange={(e) => onToggleDefault(document.id, e.target.checked)}
                          />
                        }
                        actions={
                          savingDocumentId === document.id ? (
                            <span className="cell-muted">Guardando…</span>
                          ) : (
                            <Badge tone={document.isDefault ? 'success' : 'neutral'}>
                              {document.isDefault ? 'Propuesto' : 'Opcional'}
                            </Badge>
                          )
                        }
                      />
                    )}
                  </li>
                );
              })}
            </StageGroup>
          ))}
        </div>
      )}
    </>
  );
}
