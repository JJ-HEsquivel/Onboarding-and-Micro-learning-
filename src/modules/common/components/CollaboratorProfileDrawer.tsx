import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router';
import { Award, RotateCcw, TriangleAlert } from 'lucide-react';
import { useCurrentUser } from '@/app/session/useSession';
import { Alert } from '@/shared/components/Alert';
import { Avatar } from '@/shared/components/Avatar';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { CollaboratorStatusBadge } from '@/shared/components/CollaboratorStatusBadge';
import { DocumentItem } from '@/shared/components/DocumentItem';
import { Drawer } from '@/shared/components/Drawer';
import { Modal } from '@/shared/components/Modal';
import { ProgressRing } from '@/shared/components/ProgressRing';
import { StageGroup } from '@/shared/components/StageGroup';
import { PROGRAM_RULES } from '@/shared/constants/program';
import { useAsync } from '@/shared/hooks/useAsync';
import { daysBetween, formatDate, todayIso } from '@/shared/lib/dates';
import { getInitials } from '@/shared/lib/format';
import type { UserRole } from '@/shared/types/navigation';
import { deactivatePerson, grantRetry, loadCollaboratorProfile } from '@/services/profile.service';
import { promotionBlocker } from '@/services/promotion.service';
import { documentStatus } from '../documentStatus';
import { ReminderButton } from './ReminderButton';
import './profile.css';

interface CollaboratorProfileDrawerProps {
  personId: string;
  /** Rol de quien mira la ficha: define qué acciones ve. */
  viewer: Extract<UserRole, 'admin' | 'manager'>;
  onClose: () => void;
  /** Se llama cuando una acción cambió datos (para recargar la lista de atrás). */
  onChanged: () => void;
}

const RISK = {
  low: { label: 'Riesgo bajo', tone: 'neutral' },
  medium: { label: 'Riesgo medio', tone: 'warning' },
  high: { label: 'Riesgo alto', tone: 'danger' },
} as const;

const dateTime = new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' });

/** Ficha de un colaborador: datos, ruta por etapas, historial y acciones. */
export function CollaboratorProfileDrawer({ personId, viewer, onClose, onChanged }: CollaboratorProfileDrawerProps) {
  const user = useCurrentUser();
  const navigate = useNavigate();
  const load = useCallback(() => loadCollaboratorProfile(personId), [personId]);
  const profile = useAsync(load);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmingDeactivation, setConfirmingDeactivation] = useState(false);

  const data = profile.data;
  const today = todayIso();

  const run = async (action: () => Promise<void>, message: string) => {
    setBusy(true);
    setActionError(null);
    try {
      await action();
      setNotice(message);
      profile.reload();
      onChanged();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  if (!data) {
    return (
      <Drawer title="Ficha del colaborador" onClose={onClose}>
        {profile.error ? <Alert tone="danger">{profile.error.message}</Alert> : <p className="page-loading">Cargando ficha…</p>}
      </Drawer>
    );
  }

  const c = data.collaborator;
  const isActive = c.status !== 'pendingValidation';
  const percent = c.documentsTotal ? Math.round((c.documentsApproved / c.documentsTotal) * 100) : 0;
  const blocker = viewer === 'admin' ? promotionBlocker(c) : null;
  const daysSinceHire = c.hireDate ? daysBetween(c.hireDate, today) : null;

  const handleDeactivate = async () => {
    setConfirmingDeactivation(false);
    setBusy(true);
    setActionError(null);
    try {
      await deactivatePerson(c.id);
      onChanged();
      onClose();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  };

  return (
    <>
      <Drawer
        title={c.fullName}
        leading={<Avatar initials={getInitials(c.fullName)} />}
        subtitle={
          <>
            <p className="profile__subtitle">
              {c.jobTitle || 'Sin cargo'} · {c.areaName}
            </p>
            <span className="profile__badges">
              <CollaboratorStatusBadge status={c.status} />
              {isActive && c.status !== 'completed' && <Badge tone={RISK[c.risk].tone}>{RISK[c.risk].label}</Badge>}
            </span>
          </>
        }
        onClose={onClose}
        footer={
          <>
            {isActive && c.status !== 'completed' && <ReminderButton person={c} sentBy={user.fullName} />}
            {data.exhaustedExams.length > 0 && c.onboardingId && (
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() =>
                  run(
                    () => grantRetry(c.onboardingId!, data.exhaustedExams),
                    `${c.fullName} puede volver a rendir ${data.exhaustedExams.length} evaluación(es).`,
                  )
                }
              >
                <RotateCcw size={16} />
                Habilitar reintento
              </Button>
            )}
            {viewer === 'manager' && isActive && (
              <Button variant="secondary" onClick={() => navigate(`/manager/asignar-documentos?colaborador=${c.id}`)}>
                Asignar documento
              </Button>
            )}
            {viewer === 'manager' && !isActive && <Button onClick={() => navigate('/manager/por-validar')}>Validar ruta</Button>}
            {viewer === 'admin' && (
              <Button
                variant="secondary"
                disabled={blocker !== null}
                title={blocker ?? undefined}
                onClick={() => navigate(`/admin/managers?ascender=${c.id}`)}
              >
                <Award size={16} />
                Ascender a Manager
              </Button>
            )}
            {viewer === 'admin' && (
              <Button variant="ghost" className="profile__danger" disabled={busy} onClick={() => setConfirmingDeactivation(true)}>
                Dar de baja
              </Button>
            )}
          </>
        }
      >
        {notice && (
          <Alert tone="success" onDismiss={() => setNotice(null)}>
            {notice}
          </Alert>
        )}
        {actionError && <Alert tone="danger">{actionError}</Alert>}
        {c.attentionReasons.length > 0 && (
          <div className="profile__attention">
            <TriangleAlert size={16} />
            <span>{c.attentionReasons.join(' · ')}</span>
          </div>
        )}

        <div className="profile__summary">
          <ProgressRing value={percent} size={92} label={`${c.documentsApproved}/${c.documentsTotal}`} tone={percent < 40 ? 'danger' : percent < 70 ? 'primary' : 'success'} />
          <dl className="profile__details">
            <dt>Correo</dt>
            <dd>{c.email || '—'}</dd>
            <dt>Fecha de ingreso</dt>
            <dd>
              {formatDate(c.hireDate)}
              {daysSinceHire !== null && (daysSinceHire >= 0 ? ` · hace ${daysSinceHire} días` : ' · próximamente')}
            </dd>
            <dt>Manager</dt>
            <dd>{c.managerName}</dd>
            {data.registeredByName && (
              <>
                <dt>Registrado por</dt>
                <dd>{data.registeredByName}</dd>
              </>
            )}
            {data.validatedOn && (
              <>
                <dt>Ruta activada</dt>
                <dd>
                  {formatDate(data.validatedOn)}
                  {data.validatorName ? ` · por ${data.validatorName}` : ''}
                </dd>
              </>
            )}
            <dt>Documentos aprobados</dt>
            <dd>
              {c.documentsApproved}/{c.documentsTotal}
            </dd>
            <dt>Promedio de exámenes</dt>
            <dd>{c.averageScore === null ? 'Sin evaluaciones' : `${c.averageScore}%`}</dd>
            <dt>Última actividad</dt>
            <dd>{c.lastActivity ? formatDate(c.lastActivity) : 'Sin actividad'}</dd>
          </dl>
        </div>

        <section>
          <h3 className="section-label">Ruta por etapas</h3>
          {data.stages.length === 0 && <p className="profile__empty">Sin documentación asignada todavía.</p>}
          <div className="profile__stages">
            {data.stages.map((stage) => (
              <StageGroup
                key={stage.id}
                name={stage.name}
                summary={`${stage.documents.filter((d) => d.step === 'approved').length}/${stage.documents.length} aprobados`}
              >
                {stage.documents.map((d) => {
                  const status = isActive ? documentStatus({ step: d.step, exam: d.entry.exam, dueDate: d.entry.dueDate }, today) : null;
                  const attempt = d.entry.exam?.attemptsUsed;
                  return (
                    <li key={d.id}>
                      <DocumentItem
                        document={d}
                        extraMeta={
                          !d.entry.isRead && d.entry.dueDate ? <span>Vence {formatDate(d.entry.dueDate)}</span> : undefined
                        }
                        actions={
                          status ? (
                            <Badge tone={status.tone}>
                              {status.label}
                              {attempt && d.step !== 'approved' ? ` · intento ${attempt}/${PROGRAM_RULES.maxAttempts}` : ''}
                            </Badge>
                          ) : (
                            <Badge>Propuesto</Badge>
                          )
                        }
                      />
                    </li>
                  );
                })}
              </StageGroup>
            ))}
          </div>
        </section>

        <section>
          <h3 className="section-label">Historial reciente</h3>
          {data.history.length === 0 ? (
            <p className="profile__empty">Sin actividad registrada todavía.</p>
          ) : (
            <ul className="profile__history">
              {data.history.map((h) => (
                <li key={h.id}>
                  <strong>{h.description}</strong>
                  <small>
                    {h.date ? dateTime.format(new Date(h.date)) : '—'} · {h.result}
                  </small>
                </li>
              ))}
            </ul>
          )}
        </section>
      </Drawer>

      {confirmingDeactivation && (
        <Modal
          title={`Dar de baja a ${c.fullName}`}
          description="Deja de aparecer en paneles y rutas. Sus evidencias se conservan para auditoría."
          onClose={() => setConfirmingDeactivation(false)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setConfirmingDeactivation(false)}>
                Cancelar
              </Button>
              <Button onClick={handleDeactivate}>Dar de baja</Button>
            </>
          }
        >
          <p>Se desactiva su registro y se cierran sus roles. Esta acción se puede revertir reactivando el contacto en Dataverse.</p>
        </Modal>
      )}
    </>
  );
}
