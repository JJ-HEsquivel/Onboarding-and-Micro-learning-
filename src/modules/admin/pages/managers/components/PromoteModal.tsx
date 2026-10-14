import { useState } from 'react';
import { Award } from 'lucide-react';
import { Alert } from '@/shared/components/Alert';
import { Button } from '@/shared/components/Button';
import { FormField } from '@/shared/components/FormField';
import { Modal } from '@/shared/components/Modal';
import type { SessionUser } from '@/shared/types/navigation';
import type { Area } from '@/shared/types/onboarding';
import { promoteToManager, type PromotionCandidate } from '@/services/promotion.service';

interface PromoteModalProps {
  candidate: PromotionCandidate;
  areas: Area[];
  /** Colaboradores que pueden pasar a su equipo. */
  otherCollaborators: PromotionCandidate[];
  admin: SessionUser;
  onClose: () => void;
  onPromoted: (fullName: string, teamSize: number) => void;
}

export function PromoteModal({ candidate, areas, otherCollaborators, admin, onClose, onPromoted }: PromoteModalProps) {
  const areaName = areas.find((a) => a.id === candidate.areaId)?.name ?? '';
  const [jobTitle, setJobTitle] = useState(areaName ? `${areaName} Manager` : 'Manager');
  const [areaId, setAreaId] = useState(candidate.areaId ?? areas[0]?.id ?? '');
  const [teamIds, setTeamIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Primero los de su misma área.
  const team = [...otherCollaborators].sort((a, b) => Number(b.areaId === areaId) - Number(a.areaId === areaId));

  const toggle = (id: string) =>
    setTeamIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleConfirm = async () => {
    if (!jobTitle.trim()) {
      setError('Ingrese el cargo como Manager.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await promoteToManager({ collaborator: candidate, jobTitle: jobTitle.trim(), areaId, teamIds: [...teamIds], admin });
      onPromoted(candidate.fullName, teamIds.size);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSaving(false);
    }
  };

  return (
    <Modal
      title={`Ascender a ${candidate.fullName}`}
      description={`${candidate.jobTitle} · ${candidate.areaName} · hoy reporta a ${candidate.managerName}`}
      onClose={saving ? () => undefined : onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={saving}>
            <Award size={16} />
            {saving ? 'Ascendiendo…' : 'Confirmar ascenso'}
          </Button>
        </>
      }
    >
      <div className="promote-form">
        <div className="form-grid">
          <FormField label="Cargo como Manager" htmlFor="promote-title">
            <input id="promote-title" className="input" maxLength={100} value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
          </FormField>
          <FormField label="Área que gestiona" htmlFor="promote-area">
            <select id="promote-area" className="input" value={areaId} onChange={(e) => setAreaId(e.target.value)}>
              {areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <h3 className="section-label">Equipo inicial (opcional) · los seleccionados pasan a reportarle</h3>
        {team.length === 0 ? (
          <p className="managers-page__empty">No hay otros colaboradores para transferir. Puede asignarle personas más adelante.</p>
        ) : (
          <ul className="checklist">
            {team.map((c) => (
              <li key={c.id}>
                <label className="checklist__item">
                  <input type="checkbox" className="doc-item__check" checked={teamIds.has(c.id)} onChange={() => toggle(c.id)} />
                  <span>
                    <strong>{c.fullName}</strong>
                    <small>
                      {c.areaName} · hoy con {c.managerName}
                      {c.status === 'pendingValidation' ? ' · por validar' : ''}
                    </small>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}

        <h3 className="section-label">Qué cambia al confirmar</h3>
        <ul className="promote-form__changes">
          <li>Recibe el rol Manager y podrá ingresar con ese perfil.</li>
          <li>Verá «Nuevos por validar» y el resto de las pantallas de Manager para su equipo.</li>
          <li>
            Su inducción ({candidate.documentsApproved} de {candidate.documentsTotal} documentos aprobados) queda como historial y deja de
            contar en los indicadores.
          </li>
          <li>El cambio de rol queda registrado como evidencia.</li>
        </ul>

        {error && <Alert tone="danger">No se pudo completar el ascenso. {error}</Alert>}
      </div>
    </Modal>
  );
}
