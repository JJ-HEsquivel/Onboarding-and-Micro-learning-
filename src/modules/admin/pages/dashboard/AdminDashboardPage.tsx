import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ChevronRight, Plus } from 'lucide-react';
import { useCurrentUser } from '@/app/session/useSession';
import { Alert } from '@/shared/components/Alert';
import { Avatar } from '@/shared/components/Avatar';
import { Button } from '@/shared/components/Button';
import { CollaboratorStatusBadge } from '@/shared/components/CollaboratorStatusBadge';
import { Modal } from '@/shared/components/Modal';
import { PageHeader } from '@/shared/components/PageHeader';
import { StatCard } from '@/shared/components/StatCard';
import { StatusBar } from '@/shared/components/StatusBar';
import { PROGRAM_RULES } from '@/shared/constants/program';
import { useAsync } from '@/shared/hooks/useAsync';
import { formatDate } from '@/shared/lib/dates';
import { getInitials, pluralize } from '@/shared/lib/format';
import type { Area, Collaborator } from '@/shared/types/onboarding';
import { loadCollaboratorsOverview } from '@/services/collaborators.service';
import { loadOnboardingCatalog } from '@/services/onboardingRoute.service';
import { CollaboratorProfileDrawer } from '@/modules/common/components/CollaboratorProfileDrawer';
import { ReminderButton } from '@/modules/common/components/ReminderButton';
import './AdminDashboardPage.css';

async function loadDashboard() {
  const [overview, catalog] = await Promise.all([loadCollaboratorsOverview(), loadOnboardingCatalog()]);
  return { ...overview, documentCount: catalog.documents.length };
}

const GETTING_STARTED = [
  ['Registrar', 'Administrador: «Registrar colaborador». Queda pendiente de validación.'],
  ['Validar', 'Manager: «Nuevos por validar» → ajusta la Etapa 3 y activa la ruta.'],
  ['Leer y rendir', 'Colaborador: lee cada documento, confirma la lectura y aprueba su examen.'],
  ['Seguir y ascender', 'Paneles, recordatorios y, con la inducción completada, el ascenso a Manager.'],
] as const;

const percent = (part: number, total: number) => (total ? Math.round((part / total) * 100) : null);

export default function AdminDashboardPage() {
  const admin = useCurrentUser();
  const navigate = useNavigate();
  const dashboard = useAsync(loadDashboard);
  const [area, setArea] = useState<Area | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);

  const data = dashboard.data;
  const people = data?.collaborators ?? [];
  const active = people.filter((c) => c.status !== 'pendingValidation');
  const reading = percent(
    active.reduce((sum, c) => sum + c.documentsRead, 0),
    active.reduce((sum, c) => sum + c.documentsTotal, 0),
  );
  const scores = active.flatMap((c) => (c.averageScore === null ? [] : [c.averageScore]));
  const comprehension = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const attention = people.filter((c) => c.attentionReasons.length > 0).sort((a, b) => a.documentsApproved - b.documentsApproved);

  const openProfile = (c: Collaborator) => {
    setArea(null);
    setProfileId(c.id);
  };

  return (
    <>
      <PageHeader
        title="Panel general"
        description="Estado consolidado de la inducción, la comprensión y el refuerzo continuo."
        actions={
          <Button onClick={() => navigate('../colaboradores')}>
            <Plus size={18} />
            Registrar colaborador
          </Button>
        }
      />

      <div className="admin-dashboard">
        {dashboard.error && <Alert tone="danger">No se pudo cargar el panel. {dashboard.error.message}</Alert>}
        {dashboard.loading && !data && <p className="page-loading">Cargando el panel…</p>}

        {data && people.length === 0 && (
          <section className="card admin-dashboard__card">
            <h2>Empezando desde cero</h2>
            <p className="admin-dashboard__subtitle">El flujo completo, en orden</p>
            <ol className="how-it-works">
              {GETTING_STARTED.map(([title, detail], i) => (
                <li key={title}>
                  <span className="how-it-works__number">{i + 1}</span>
                  <strong>{title}</strong>
                  <p>{detail}</p>
                </li>
              ))}
            </ol>
          </section>
        )}

        {data && (
          <>
            <div className="admin-dashboard__stats">
              <StatCard
                label="Cumplimiento de lectura"
                value={reading === null ? '—' : `${reading}%`}
                caption={`${active.reduce((s, c) => s + c.documentsRead, 0)} de ${active.reduce((s, c) => s + c.documentsTotal, 0)} lecturas confirmadas`}
              />
              <StatCard
                label="Comprensión promedio"
                value={comprehension === null ? '—' : `${comprehension}%`}
                caption={`Mínimo de aprobación ${PROGRAM_RULES.passingScore}%`}
              />
              <StatCard
                label="Inducciones en curso"
                value={people.filter((c) => c.status === 'inProgress').length}
                caption={`Con documentos por leer o aprobar · ${people.filter((c) => c.status === 'overdue').length} atrasado(s)`}
              />
              <StatCard label="Documentos controlados" value={data.documentCount} caption="Documentos vigentes en el repositorio" />
            </div>

            <div className="admin-dashboard__grid">
              <section className="card admin-dashboard__card">
                <h2>Estado de la inducción por área</h2>
                <p className="admin-dashboard__subtitle">Toque un área para ver el detalle de cada colaborador</p>
                <ul className="area-list">
                  {data.areas.map((a) => {
                    const ofArea = people.filter((c) => c.areaId === a.id);
                    const count = (status: Collaborator['status']) => ofArea.filter((c) => c.status === status).length;
                    return (
                      <li key={a.id}>
                        <button type="button" className="area-list__row" onClick={() => setArea(a)}>
                          <strong>{a.name}</strong>
                          <span className="area-list__count">{pluralize(ofArea.length, 'colaborador', 'colaboradores')}</span>
                          <span className="area-list__detail">
                            {ofArea.length
                              ? `${count('completed')} completado · ${count('inProgress')} en curso${count('overdue') ? ` · ${count('overdue')} atrasado` : ''}${
                                  count('pendingValidation') ? ` · ${count('pendingValidation')} por validar` : ''
                                }`
                              : 'Sin registros'}
                          </span>
                          <ChevronRight size={16} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>

              <section className="card admin-dashboard__card">
                <h2>Estado de las inducciones</h2>
                <p className="admin-dashboard__subtitle">Distribución actual · toda la organización</p>
                <StatusBar statuses={people.map((c) => c.status)} />
              </section>
            </div>

            <section className="card">
              <header className="admin-dashboard__header">
                <div>
                  <h2>Colaboradores que requieren atención</h2>
                  <p className="admin-dashboard__subtitle">Validaciones pendientes, vencimientos, evaluaciones reprobadas e inactividad</p>
                </div>
                <Button variant="secondary" onClick={() => navigate('../colaboradores')}>
                  Ver todos
                </Button>
              </header>
              {attention.length === 0 ? (
                <p className="admin-dashboard__empty">
                  {people.length ? 'Nadie requiere atención en este momento.' : 'Todavía no hay colaboradores registrados.'}
                </p>
              ) : (
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Colaborador</th>
                        <th>Área</th>
                        <th>Motivo</th>
                        <th>Documentos</th>
                        <th>Última actividad</th>
                        <th>Estado</th>
                        <th>
                          <span className="visually-hidden">Acciones</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {attention.slice(0, 8).map((c) => (
                        <tr key={c.id} className="table__row--clickable" onClick={() => openProfile(c)}>
                          <td>
                            <div className="person-cell">
                              <Avatar initials={getInitials(c.fullName)} size="sm" />
                              <div>
                                <p className="person-cell__name">{c.fullName}</p>
                                <p className="person-cell__subtitle">{c.jobTitle}</p>
                              </div>
                            </div>
                          </td>
                          <td>{c.areaName}</td>
                          <td className="admin-dashboard__reason">{c.attentionReasons.join(' · ')}</td>
                          <td>
                            {c.documentsApproved}/{c.documentsTotal}
                          </td>
                          <td className="nowrap">{c.lastActivity ? formatDate(c.lastActivity) : 'Sin actividad'}</td>
                          <td>
                            <CollaboratorStatusBadge status={c.status} />
                          </td>
                          <td>
                            {c.status !== 'pendingValidation' && <ReminderButton person={c} sentBy={admin.fullName} variant="secondary" />}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {area && data && (
        <AreaDetailModal area={area} collaborators={people.filter((c) => c.areaId === area.id)} onClose={() => setArea(null)} onOpen={openProfile} />
      )}

      {profileId && (
        <CollaboratorProfileDrawer personId={profileId} viewer="admin" onClose={() => setProfileId(null)} onChanged={dashboard.reload} />
      )}
    </>
  );
}

interface AreaDetailModalProps {
  area: Area;
  collaborators: Collaborator[];
  onClose: () => void;
  onOpen: (collaborator: Collaborator) => void;
}

/** Detalle de un área: misma distribución por estado, filtrada al área, y sus colaboradores. */
function AreaDetailModal({ area, collaborators, onClose, onOpen }: AreaDetailModalProps) {
  return (
    <Modal
      title={`Estado de inducción · ${area.name}`}
      description={`${pluralize(collaborators.length, 'colaborador', 'colaboradores')} del área`}
      onClose={onClose}
      footer={<Button onClick={onClose}>Cerrar</Button>}
    >
      <div className="admin-dashboard__area-detail">
        <StatusBar statuses={collaborators.map((c) => c.status)} />
        {collaborators.length > 0 && (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Colaborador</th>
                  <th>Manager</th>
                  <th>Documentos</th>
                  <th>Promedio</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {collaborators.map((c) => (
                  <tr key={c.id} className="table__row--clickable" onClick={() => onOpen(c)}>
                    <td>{c.fullName}</td>
                    <td>{c.managerName}</td>
                    <td>
                      {c.documentsApproved}/{c.documentsTotal}
                    </td>
                    <td>{c.averageScore === null ? '—' : `${c.averageScore}%`}</td>
                    <td>
                      <CollaboratorStatusBadge status={c.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  );
}
