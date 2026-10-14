import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, TriangleAlert, UserPlus } from 'lucide-react';
import { Alert } from '@/shared/components/Alert';
import { Avatar } from '@/shared/components/Avatar';
import { BarList } from '@/shared/components/BarList';
import { Button } from '@/shared/components/Button';
import { CollaboratorStatusBadge } from '@/shared/components/CollaboratorStatusBadge';
import { PageHeader } from '@/shared/components/PageHeader';
import { StatCard } from '@/shared/components/StatCard';
import { PROGRAM_RULES } from '@/shared/constants/program';
import { formatDate } from '@/shared/lib/dates';
import { getInitials } from '@/shared/lib/format';
import { CollaboratorProfileDrawer } from '@/modules/common/components/CollaboratorProfileDrawer';
import { ReminderButton } from '@/modules/common/components/ReminderButton';
import { useTeam } from '../../hooks/useTeam';
import '../manager.css';

const average = (values: number[]) => (values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null);

export default function ManagerDashboardPage() {
  const { manager, data, error, loading, reload } = useTeam();
  const navigate = useNavigate();
  const [profileId, setProfileId] = useState<string | null>(null);

  const team = data?.collaborators ?? [];
  const active = team.filter((c) => c.status !== 'pendingValidation');
  const pending = team.filter((c) => c.status === 'pendingValidation');
  const attention = team.filter((c) => c.attentionReasons.length > 0);
  const progress = average(active.filter((c) => c.documentsTotal > 0).map((c) => Math.round((c.documentsApproved / c.documentsTotal) * 100)));
  const comprehension = average(active.flatMap((c) => (c.averageScore === null ? [] : [c.averageScore])));

  return (
    <>
      <PageHeader
        title="Panel del equipo"
        description="Estado de la inducción de los colaboradores a su cargo."
        actions={
          <Button onClick={() => navigate('../asignar-documentos')}>
            <Plus size={18} />
            Asignar documento
          </Button>
        }
      />

      <div className="manager-page">
        {error && <Alert tone="danger">No se pudo cargar su equipo. {error.message}</Alert>}
        {loading && !data && <p className="page-loading">Cargando su equipo…</p>}

        {pending.map((c) => (
          <div key={c.id} className="manager-notice">
            <UserPlus size={20} />
            <div>
              <strong>Se le asignó un nuevo colaborador para validar</strong>
              <p>
                {c.fullName} · {c.jobTitle} · {c.areaName} · ingreso el {formatDate(c.hireDate)}. Revise su documentación (puede ajustar
                la Etapa 3) y confirme para activar su acceso.
              </p>
            </div>
            <Button onClick={() => navigate('../por-validar')}>Revisar y validar</Button>
          </div>
        ))}

        {data && (
          <>
            <div className="manager-page__stats">
              <StatCard
                label="Colaboradores a cargo"
                value={team.length}
                caption={`${team.filter((c) => c.status === 'completed').length} con inducción cerrada · ${pending.length} por validar`}
              />
              <StatCard label="Avance promedio" value={progress === null ? '—' : `${progress}%`} caption="Documentos aprobados sobre el total asignado" />
              <StatCard
                label="Comprensión promedio"
                value={comprehension === null ? '—' : `${comprehension}%`}
                caption={`Mínimo exigido ${PROGRAM_RULES.passingScore}%`}
              />
              <StatCard
                label="Requieren atención"
                value={attention.length}
                caption={attention[0] ? `${attention[0].fullName} · ${attention[0].attentionReasons[0]}` : 'Todo en orden'}
              />
            </div>

            <div className="manager-page__grid">
              <section className="card">
                <header className="manager-page__header">
                  <div>
                    <h2>Avance del equipo</h2>
                    <p>Documentos aprobados sobre el total asignado a cada colaborador</p>
                  </div>
                  <Button variant="secondary" onClick={() => navigate('../colaboradores')}>
                    Ver detalle
                  </Button>
                </header>
                {team.length === 0 ? (
                  <p className="manager-page__empty">
                    Todavía no tiene colaboradores a cargo. Aparecerán cuando un Administrador registre a alguien con usted como Manager.
                  </p>
                ) : (
                  <div className="table-wrapper">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Colaborador</th>
                          <th>Ingreso</th>
                          <th>Documentos</th>
                          <th>Promedio</th>
                          <th>Estado</th>
                          <th>
                            <span className="visually-hidden">Acciones</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {team.map((c) => (
                          <tr key={c.id} className="table__row--clickable" onClick={() => setProfileId(c.id)}>
                            <td>
                              <div className="person-cell">
                                <Avatar initials={getInitials(c.fullName)} size="sm" />
                                <div>
                                  <p className="person-cell__name">{c.fullName}</p>
                                  <p className="person-cell__subtitle">{c.jobTitle}</p>
                                </div>
                              </div>
                            </td>
                            <td className="nowrap">{formatDate(c.hireDate)}</td>
                            <td>
                              {c.documentsApproved}/{c.documentsTotal}
                            </td>
                            <td>{c.averageScore === null ? '—' : `${c.averageScore}%`}</td>
                            <td>
                              <CollaboratorStatusBadge status={c.status} />
                            </td>
                            <td>
                              {c.status === 'pendingValidation' ? (
                                <Button
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    navigate('../por-validar');
                                  }}
                                >
                                  Validar
                                </Button>
                              ) : c.status !== 'completed' ? (
                                <ReminderButton person={c} sentBy={manager.fullName} variant="secondary" />
                              ) : null}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <div className="manager-page__side">
                <section className="card manager-page__panel">
                  <h2>Requiere su atención</h2>
                  <p className="manager-page__subtitle">Validaciones, vencimientos, reprobados e inactividad</p>
                  {attention.length === 0 ? (
                    <p className="manager-page__empty">Nadie de su equipo requiere atención.</p>
                  ) : (
                    <ul className="attention-feed">
                      {attention.slice(0, 5).map((c) => (
                        <li key={c.id}>
                          <button type="button" onClick={() => setProfileId(c.id)}>
                            <TriangleAlert size={16} />
                            <span>
                              <strong>{c.fullName}</strong>
                              <small>{c.attentionReasons.join(' · ')}</small>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section className="card manager-page__panel">
                  <h2>Comprensión del equipo</h2>
                  <p className="manager-page__subtitle">Promedio de exámenes por colaborador</p>
                  <BarList
                    items={active
                      .filter((c) => c.averageScore !== null)
                      .map((c) => ({ key: c.id, label: c.fullName.split(' ')[0], value: c.averageScore! }))}
                    reference={{ value: PROGRAM_RULES.passingScore, label: `Mínimo de aprobación ${PROGRAM_RULES.passingScore}%` }}
                    emptyText="Aparecerá cuando su equipo rinda los primeros exámenes."
                  />
                </section>
              </div>
            </div>
          </>
        )}
      </div>

      {profileId && (
        <CollaboratorProfileDrawer personId={profileId} viewer="manager" onClose={() => setProfileId(null)} onChanged={reload} />
      )}
    </>
  );
}
