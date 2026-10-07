import { useState } from 'react';
import { Check } from 'lucide-react';
import { Alert } from '@/shared/components/Alert';
import { Avatar } from '@/shared/components/Avatar';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { DocumentItem } from '@/shared/components/DocumentItem';
import { StageGroup } from '@/shared/components/StageGroup';
import { formatDate } from '@/shared/lib/dates';
import { getInitials, pluralize } from '@/shared/lib/format';
import type { RouteStage } from '@/shared/types/onboarding';
import { confirmOnboarding, type PendingOnboarding } from '@/services/validation.service';

interface PendingValidationCardProps {
  pending: PendingOnboarding;
  /** Todas las etapas con todos sus documentos. */
  catalog: RouteStage[];
  onConfirmed: (fullName: string) => void;
}

/** Un colaborador por validar: sus datos y la lista de documentos para tildar o destildar. */
export function PendingValidationCard({ pending, catalog, onConfirmed }: PendingValidationCardProps) {
  const [selected, setSelected] = useState(() => new Set(pending.assignedDocuments.keys()));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { collaborator } = pending;

  const toggle = (documentId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(documentId)) next.delete(documentId);
      else next.add(documentId);
      return next;
    });
  };

  const handleConfirm = async () => {
    setSaving(true);
    setError(null);
    try {
      await confirmOnboarding(pending, selected, catalog);
      onConfirmed(collaborator.fullName);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSaving(false);
    }
  };

  return (
    <section className="card pending-card">
      <header className="pending-card__header">
        <div className="person-cell">
          <Avatar initials={getInitials(collaborator.fullName)} />
          <div>
            <p className="person-cell__name">{collaborator.fullName}</p>
            <p className="person-cell__subtitle">{collaborator.jobTitle}</p>
          </div>
        </div>
        <Badge tone="warning">Pendiente de validación</Badge>
      </header>

      <div className="pending-card__body">
        <dl className="pending-card__details">
          <div>
            <dt>Área</dt>
            <dd>{pending.areaName}</dd>
          </div>
          <div>
            <dt>Fecha de ingreso</dt>
            <dd>{formatDate(pending.hireDate)}</dd>
          </div>
          <div>
            <dt>Correo</dt>
            <dd>{collaborator.email || '—'}</dd>
          </div>
          <div>
            <dt>Registrado por</dt>
            <dd>{pending.registeredByName ?? 'Sin dato'}</dd>
          </div>
        </dl>

        <h3 className="pending-card__section-title">
          Documentación propuesta · destilde para quitar, tilde para sumar ({pluralize(selected.size, 'documento seleccionado', 'documentos seleccionados')})
        </h3>

        {catalog.map((stage) => {
          const selectedInStage = stage.documents.filter((d) => selected.has(d.id)).length;
          return (
            <StageGroup key={stage.id} name={stage.name} summary={`${selectedInStage} de ${stage.documents.length}`}>
              {stage.documents.map((document) => {
                const inputId = `${pending.onboardingId}-${document.id}`;
                const isSelected = selected.has(document.id);
                const wasProposed = pending.assignedDocuments.has(document.id);
                return (
                  <li key={document.id}>
                    <DocumentItem
                      document={document}
                      htmlFor={inputId}
                      muted={!isSelected}
                      leading={
                        <input
                          id={inputId}
                          type="checkbox"
                          className="doc-item__check"
                          checked={isSelected}
                          disabled={saving}
                          onChange={() => toggle(document.id)}
                        />
                      }
                      actions={
                        isSelected && !wasProposed ? (
                          <Badge tone="success">Agregado</Badge>
                        ) : !isSelected && wasProposed ? (
                          <Badge tone="danger">Se quitará</Badge>
                        ) : null
                      }
                    />
                  </li>
                );
              })}
            </StageGroup>
          );
        })}

        {error && <Alert tone="danger">No se pudo activar la ruta. {error}</Alert>}
      </div>

      <footer className="pending-card__footer">
        <Button onClick={handleConfirm} disabled={saving || selected.size === 0}>
          <Check size={16} />
          {saving ? 'Activando…' : 'Confirmar y activar ruta'}
        </Button>
        <span className="pending-card__hint">
          {selected.size === 0
            ? 'Seleccione al menos un documento para activar la ruta.'
            : 'Al confirmar, el colaborador podrá ver su documentación y empezar a leer.'}
        </span>
      </footer>
    </section>
  );
}
