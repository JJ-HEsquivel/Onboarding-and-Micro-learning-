import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router';
import { FileText } from 'lucide-react';
import { useCurrentUser } from '@/app/session/useSession';
import { Alert } from '@/shared/components/Alert';
import { Avatar } from '@/shared/components/Avatar';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { DocumentItem } from '@/shared/components/DocumentItem';
import { EmptyState } from '@/shared/components/EmptyState';
import { FormField } from '@/shared/components/FormField';
import { PageHeader } from '@/shared/components/PageHeader';
import { StageGroup } from '@/shared/components/StageGroup';
import { PROGRAM_RULES } from '@/shared/constants/program';
import { useAsync } from '@/shared/hooks/useAsync';
import { getInitials } from '@/shared/lib/format';
import { addStageDocuments, loadAssignableTeam, type AssignableCollaborator } from '@/services/team.service';
import '../manager.css';
import './ManagerAssignDocumentsPage.css';

/**
 * Asignar documentos: el Manager solo puede sumar documentos de la Etapa 3 del área de cada
 * colaborador (los que todavía no tiene). Las Etapas 1 y 2 son obligatorias y no se tocan aquí.
 */
export default function ManagerAssignDocumentsPage() {
  const manager = useCurrentUser();
  const load = useCallback(() => loadAssignableTeam(manager.id), [manager.id]);
  const team = useAsync(load);
  const [searchParams, setSearchParams] = useSearchParams();
  const [notice, setNotice] = useState<string | null>(null);

  const members = team.data ?? [];
  const selectedId = members.some((m) => m.collaborator.id === searchParams.get('colaborador'))
    ? searchParams.get('colaborador')!
    : members[0]?.collaborator.id;
  const selected = members.find((m) => m.collaborator.id === selectedId);

  const select = (id: string) => setSearchParams({ colaborador: id }, { replace: true });

  return (
    <>
      <PageHeader title="Asignar documentos" description="Documentación específica adicional para los colaboradores de su equipo." />

      <div className="manager-page">
        {notice && (
          <Alert tone="success" onDismiss={() => setNotice(null)}>
            {notice}
          </Alert>
        )}
        {team.error && <Alert tone="danger">No se pudo cargar su equipo. {team.error.message}</Alert>}
        {team.loading && !team.data && <p className="page-loading">Cargando…</p>}

        {team.data && members.length === 0 && (
          <section className="card">
            <EmptyState
              icon={FileText}
              title="No tiene colaboradores activos"
              description="Valide primero a los nuevos en «Nuevos por validar»."
            />
          </section>
        )}

        {selected && (
          <div className="assign">
            <StageDocumentsPicker
              // Al cambiar de colaborador se reinicia la selección.
              key={selected.collaborator.id}
              member={selected}
              managerName={manager.fullName}
              onAssigned={(message) => {
                setNotice(message);
                team.reload();
              }}
            />

            <section className="card manager-page__panel assign__members">
              <h2>Colaborador</h2>
              <p className="manager-page__subtitle">Los documentos dependen de su área</p>
              <ul className="assign__member-list" role="radiogroup" aria-label="Colaborador">
                {members.map((m) => {
                  const areaDocs = m.areaStages.flatMap((s) => s.documents);
                  const has = areaDocs.filter((d) => m.assigned.has(d.id)).length;
                  return (
                    <li key={m.collaborator.id}>
                      <label className="assign__member">
                        <input
                          type="radio"
                          name="assign-collaborator"
                          checked={m.collaborator.id === selectedId}
                          onChange={() => select(m.collaborator.id)}
                        />
                        <Avatar initials={getInitials(m.collaborator.fullName)} size="sm" />
                        <span>
                          <strong>{m.collaborator.fullName}</strong>
                          <small>
                            {m.collaborator.areaName} · Etapa 3: {has} de {areaDocs.length}
                          </small>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>
        )}
      </div>
    </>
  );
}

interface StageDocumentsPickerProps {
  member: AssignableCollaborator;
  managerName: string;
  onAssigned: (message: string) => void;
}

function StageDocumentsPicker({ member, managerName, onAssigned }: StageDocumentsPickerProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dueDays, setDueDays] = useState<number>(PROGRAM_RULES.extraDocumentDueDays);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { collaborator, areaStages, assigned } = member;

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleAssign = async () => {
    setSaving(true);
    setError(null);
    try {
      for (const stage of areaStages) {
        const documents = stage.documents.filter((d) => selected.has(d.id));
        if (documents.length > 0) {
          await addStageDocuments({ collaborator, stage, documents, dueDays, managerName });
        }
      }
      onAssigned(`${selected.size} documento(s) sumados a la Etapa 3 de ${collaborator.fullName}.`);
      setSelected(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="card manager-page__panel">
      <h2>Etapa 3 de {collaborator.fullName}</h2>
      <p className="manager-page__subtitle">
        Documentos de {collaborator.areaName} · las Etapas 1 y 2 son obligatorias y no se modifican aquí
      </p>

      {areaStages.length === 0 && <p className="manager-page__empty">Su área no tiene documentación específica configurada.</p>}

      {areaStages.map((stage) => (
        <StageGroup key={stage.id} name={stage.name}>
          {stage.documents.map((document) => {
            const entry = assigned.get(document.id);
            const inputId = `assign-${document.id}`;
            return (
              <li key={document.id}>
                <DocumentItem
                  document={document}
                  htmlFor={entry ? undefined : inputId}
                  muted={Boolean(entry)}
                  leading={
                    <input
                      id={inputId}
                      type="checkbox"
                      className="doc-item__check"
                      checked={Boolean(entry) || selected.has(document.id)}
                      disabled={Boolean(entry) || saving}
                      onChange={() => toggle(document.id)}
                    />
                  }
                  actions={
                    entry ? (
                      <Badge tone="success">Ya en su ruta{entry.isRead ? ' · leído' : ''}</Badge>
                    ) : (
                      <Badge>Disponible</Badge>
                    )
                  }
                />
              </li>
            );
          })}
        </StageGroup>
      ))}

      <div className="assign__footer">
        <FormField label="Plazo de lectura (días)" htmlFor="assign-due-days">
          <input
            id="assign-due-days"
            type="number"
            min={1}
            className="input"
            value={dueDays}
            onChange={(e) => setDueDays(Math.max(1, Number(e.target.value) || 1))}
          />
        </FormField>
        <Button onClick={handleAssign} disabled={saving || selected.size === 0}>
          {saving ? 'Sumando…' : `Sumar a la Etapa 3${selected.size ? ` (${selected.size})` : ''}`}
        </Button>
      </div>
      <p className="manager-page__subtitle">Cada documento sumado trae su examen, que se habilita al confirmar la lectura.</p>
      {error && <Alert tone="danger">No se pudo asignar. {error}</Alert>}
    </section>
  );
}
