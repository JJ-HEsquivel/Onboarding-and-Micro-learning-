import { useState } from 'react';
import { Alert } from '@/shared/components/Alert';
import { Button } from '@/shared/components/Button';
import { FormField } from '@/shared/components/FormField';
import { Modal } from '@/shared/components/Modal';
import { transferTeam, type ManagerSummary, type PromotionCandidate } from '@/services/promotion.service';

interface TransferTeamModalProps {
  manager: ManagerSummary;
  team: PromotionCandidate[];
  destinations: ManagerSummary[];
  onClose: () => void;
  onTransferred: (count: number, destinationName: string) => void;
}

export function TransferTeamModal({ manager, team, destinations, onClose, onTransferred }: TransferTeamModalProps) {
  const [destinationId, setDestinationId] = useState(destinations[0]?.id ?? '');
  const [selected, setSelected] = useState(() => new Set(team.map((c) => c.id)));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleTransfer = async () => {
    const destination = destinations.find((d) => d.id === destinationId);
    if (!destination || selected.size === 0) {
      setError('Elija el nuevo Manager y al menos un colaborador.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await transferTeam([...selected], destination.id);
      onTransferred(selected.size, destination.fullName);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSaving(false);
    }
  };

  return (
    <Modal
      title={`Transferir equipo de ${manager.fullName}`}
      description={`${team.length} colaborador(es) a cargo`}
      onClose={saving ? () => undefined : onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleTransfer} disabled={saving || destinations.length === 0}>
            {saving ? 'Transfiriendo…' : 'Transferir'}
          </Button>
        </>
      }
    >
      <div className="promote-form">
        <FormField
          label="Nuevo Manager"
          htmlFor="transfer-destination"
          hint={destinations.length === 0 ? 'No hay otro Manager al que transferir.' : undefined}
        >
          <select
            id="transfer-destination"
            className="input"
            value={destinationId}
            onChange={(e) => setDestinationId(e.target.value)}
            disabled={destinations.length === 0}
          >
            {destinations.map((d) => (
              <option key={d.id} value={d.id}>
                {d.fullName} · {d.jobTitle}
              </option>
            ))}
          </select>
        </FormField>

        <h3 className="section-label">Colaboradores a transferir</h3>
        <ul className="checklist">
          {team.map((c) => (
            <li key={c.id}>
              <label className="checklist__item">
                <input type="checkbox" className="doc-item__check" checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
                <span>
                  <strong>{c.fullName}</strong>
                  <small>
                    {c.areaName}
                    {c.status === 'pendingValidation' ? ' · por validar' : ''}
                  </small>
                </span>
              </label>
            </li>
          ))}
        </ul>
        <p className="managers-page__empty">Las validaciones pendientes pasan al nuevo Manager.</p>

        {error && <Alert tone="danger">{error}</Alert>}
      </div>
    </Modal>
  );
}
