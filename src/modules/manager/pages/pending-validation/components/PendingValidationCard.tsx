import { useState } from 'react';
import { Check } from 'lucide-react';
import { Alert } from '@/shared/components/Alert';
import { Avatar } from '@/shared/components/Avatar';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { DocumentItem } from '@/shared/components/DocumentItem';
import { StageGroup } from '@/shared/components/StageGroup';
import { formatDate } from '@/shared/lib/dates';
import { getInitials } from '@/shared/lib/format';
import { confirmOnboarding, validateSelection, type PendingOnboarding } from '@/services/validation.service';

interface PendingValidationCardProps {
  pending: PendingOnboarding;
  onConfirmed: (fullName: string) => void;
}

/**
 * Un colaborador por validar: sus datos y su ruta por etapa.
 * Las Etapas 1 y 2 son fijas; en la Etapa 3 del área se tilda o destilda.
 */
export function PendingValidationCard({ pending, onConfirmed }: PendingValidationCardProps) {
  const { collaborator, areaRoute } = pending;
  // Solo se guarda la selección de la Etapa 3: las etapas generales van siempre completas.
  const [selected, setSelected] = useState(() => {
    const areaDocuments = areaRoute.filter((s) => !s.isGeneral).flatMap((s) => s.documents.map((d) => d.id));
    return new Set(areaDocuments.filter((id) => pending.assignedDocuments.has(id)));
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allSelected = new Set(selected);
  areaRoute.filter((s) => s.isGeneral).forEach((s) => s.documents.forEach((d) => allSelected.add(d.id)));
  const problem = validateSelection(areaRoute, allSelected);

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
      await confirmOnboarding(pending, selected);
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

        <h3 className="section-label">
          Documentación por etapa · las Etapas 1 y 2 son obligatorias; en la Etapa 3 puede quitar o sumar documentos del área
        </h3>

        {areaRoute.map((stage) => {
          const editable = !stage.isGeneral;
          const marked = stage.documents.filter((d) => allSelected.has(d.id)).length;
          return (
            <StageGroup
              key={stage.id}
              name={stage.name}
              summary={
                <span className="pending-card__stage-summary">
                  {editable ? `${marked} de ${stage.documents.length} seleccionados` : `${stage.documents.length} documentos obligatorios`}
                  <Badge tone={editable ? 'info' : 'neutral'}>{editable ? 'Editable por el Manager' : 'Fija'}</Badge>
                </span>
              }
            >
              {stage.documents.map((document) => {
                const inputId = `${pending.onboardingId}-${document.id}`;
                const isSelected = allSelected.has(document.id);
                return (
                  <li key={document.id}>
                    <DocumentItem
                      document={document}
                      htmlFor={editable ? inputId : undefined}
                      muted={!isSelected}
                      leading={
                        <input
                          id={inputId}
                          type="checkbox"
                          className="doc-item__check"
                          checked={isSelected}
                          disabled={!editable || saving}
                          onChange={() => toggle(document.id)}
                        />
                      }
                      actions={
                        editable ? (
                          pending.assignedDocuments.has(document.id) ? (
                            <Badge tone="success">Enviado por el Admin</Badge>
                          ) : (
                            <Badge>Adicional del área</Badge>
                          )
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
        <Button onClick={handleConfirm} disabled={saving || problem !== null}>
          <Check size={16} />
          {saving ? 'Activando…' : 'Confirmar y activar ruta'}
        </Button>
        <span className="pending-card__hint">
          {problem ?? 'Al confirmar, el colaborador podrá ver su documentación y empezar a leer.'}
        </span>
      </footer>
    </section>
  );
}
