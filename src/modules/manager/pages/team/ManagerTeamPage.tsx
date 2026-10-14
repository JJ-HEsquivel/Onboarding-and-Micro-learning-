import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Download, Plus, Users } from 'lucide-react';
import { Alert } from '@/shared/components/Alert';
import { Avatar } from '@/shared/components/Avatar';
import { Button } from '@/shared/components/Button';
import { CollaboratorStatusBadge } from '@/shared/components/CollaboratorStatusBadge';
import { EmptyState } from '@/shared/components/EmptyState';
import { PageHeader } from '@/shared/components/PageHeader';
import { formatDate } from '@/shared/lib/dates';
import { getInitials, pluralize } from '@/shared/lib/format';
import { EMPTY_FILTERS, exportCollaboratorsCsv, filterCollaborators } from '@/modules/common/collaboratorFilters';
import { CollaboratorProfileDrawer } from '@/modules/common/components/CollaboratorProfileDrawer';
import { useTeam } from '../../hooks/useTeam';
import '../manager.css';

/** Mi equipo: avance de cada colaborador a cargo y acceso a su ficha. */
export default function ManagerTeamPage() {
  const { data, error, loading, reload } = useTeam();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [profileId, setProfileId] = useState<string | null>(null);

  const visible = useMemo(
    () => filterCollaborators(data?.collaborators ?? [], { ...EMPTY_FILTERS, search }),
    [data, search],
  );

  return (
    <>
      <PageHeader
        title="Mi equipo"
        description="Avance de cada colaborador a su cargo y casos que requieren atención."
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

        {data && (
          <section className="card">
            <div className="manager-page__toolbar">
              <input
                type="search"
                className="input"
                placeholder="Buscar en mi equipo"
                aria-label="Buscar en mi equipo"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <span className="manager-page__count">{pluralize(visible.length, 'colaborador', 'colaboradores')}</span>
              <Button variant="secondary" onClick={() => exportCollaboratorsCsv(visible)} disabled={visible.length === 0}>
                <Download size={16} />
                CSV
              </Button>
            </div>

            {data.collaborators.length === 0 ? (
              <EmptyState icon={Users} title="Todavía no tiene colaboradores a cargo" />
            ) : (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Colaborador</th>
                      <th>Ingreso</th>
                      <th>Cargo</th>
                      <th>Documentos</th>
                      <th>Promedio</th>
                      <th>Última actividad</th>
                      <th>Estado</th>
                      <th>
                        <span className="visually-hidden">Acciones</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((c) => (
                      <tr key={c.id} className="table__row--clickable" onClick={() => setProfileId(c.id)}>
                        <td>
                          <div className="person-cell">
                            <Avatar initials={getInitials(c.fullName)} size="sm" />
                            <div>
                              <p className="person-cell__name">{c.fullName}</p>
                              <p className="person-cell__subtitle">{c.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="nowrap">{formatDate(c.hireDate)}</td>
                        <td>{c.jobTitle || '—'}</td>
                        <td>
                          {c.documentsApproved}/{c.documentsTotal}
                        </td>
                        <td>{c.averageScore === null ? '—' : `${c.averageScore}%`}</td>
                        <td className="nowrap">{c.lastActivity ? formatDate(c.lastActivity) : 'Sin actividad'}</td>
                        <td>
                          <CollaboratorStatusBadge status={c.status} />
                        </td>
                        <td>
                          <Button
                            variant="secondary"
                            onClick={(event) => {
                              event.stopPropagation();
                              setProfileId(c.id);
                            }}
                          >
                            Ver ficha
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>

      {profileId && (
        <CollaboratorProfileDrawer personId={profileId} viewer="manager" onClose={() => setProfileId(null)} onChanged={reload} />
      )}
    </>
  );
}
