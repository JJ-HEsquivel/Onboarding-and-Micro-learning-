import { useCallback, useState } from 'react';
import { SquareCheckBig } from 'lucide-react';
import { useCurrentUser } from '@/app/session/useSession';
import { Alert } from '@/shared/components/Alert';
import { Avatar } from '@/shared/components/Avatar';
import { Badge } from '@/shared/components/Badge';
import { EmptyState } from '@/shared/components/EmptyState';
import { PageHeader } from '@/shared/components/PageHeader';
import { StatCard } from '@/shared/components/StatCard';
import { PROGRAM_RULES } from '@/shared/constants/program';
import { useAsync } from '@/shared/hooks/useAsync';
import { getInitials } from '@/shared/lib/format';
import { loadTeamResults } from '@/services/team.service';
import { CollaboratorProfileDrawer } from '@/modules/common/components/CollaboratorProfileDrawer';
import '../manager.css';

const RESULT_BADGE = {
  passed: { label: 'Aprobada', tone: 'success' },
  failed: { label: 'Reprobada', tone: 'danger' },
  pending: { label: 'Pendiente', tone: 'neutral' },
} as const;

const dateTime = new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' });

/** Resultados de los exámenes de su equipo: último intento de cada evaluación habilitada. */
export default function ManagerResultsPage() {
  const manager = useCurrentUser();
  const load = useCallback(() => loadTeamResults(manager.id), [manager.id]);
  const { data, error, loading, reload } = useAsync(load);
  const [profileId, setProfileId] = useState<string | null>(null);

  const approval = data && data.taken ? Math.round((data.passed / data.taken) * 100) : null;

  return (
    <>
      <PageHeader title="Resultados" description="Resultados de las evaluaciones de su equipo." />

      <div className="manager-page">
        {error && <Alert tone="danger">No se pudieron cargar los resultados. {error.message}</Alert>}
        {loading && !data && <p className="page-loading">Cargando resultados…</p>}

        {data && (
          <>
            <div className="manager-page__stats">
              <StatCard label="Evaluaciones rendidas" value={data.taken} caption={`De ${data.enabled} habilitadas al equipo`} />
              <StatCard label="Aprobación" value={approval === null ? '—' : `${approval}%`} caption={`Mínimo exigido ${PROGRAM_RULES.passingScore}%`} />
              <StatCard label="Reintentos" value={data.retries} caption="Intentos adicionales tras reprobar" />
              <StatCard label="Reprobadas" value={data.results.filter((r) => r.status === 'failed').length} caption="Pendientes de un nuevo intento" />
            </div>

            <section className="card">
              <header className="manager-page__header">
                <div>
                  <h2>Resultados por colaborador</h2>
                  <p>Último intento registrado en cada evaluación habilitada</p>
                </div>
              </header>
              {data.results.length === 0 ? (
                <EmptyState
                  icon={SquareCheckBig}
                  title="Todavía no hay evaluaciones habilitadas en su equipo"
                  description="Se habilitan cuando el colaborador confirma la lectura de un documento."
                />
              ) : (
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Colaborador</th>
                        <th>Evaluación</th>
                        <th>Intento</th>
                        <th>Puntaje</th>
                        <th>Resultado</th>
                        <th>Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.results.map((r, i) => (
                        <tr key={`${r.collaborator.id}-${i}`} className="table__row--clickable" onClick={() => setProfileId(r.collaborator.id)}>
                          <td>
                            <div className="person-cell">
                              <Avatar initials={getInitials(r.collaborator.fullName)} size="sm" />
                              <div>
                                <p className="person-cell__name">{r.collaborator.fullName}</p>
                                <p className="person-cell__subtitle">{r.collaborator.jobTitle}</p>
                              </div>
                            </div>
                          </td>
                          <td>{r.documentTitle}</td>
                          <td className="nowrap">{r.attemptsUsed ? `${r.attemptsUsed} de ${PROGRAM_RULES.maxAttempts}` : '—'}</td>
                          <td>
                            <strong>{r.score === null ? '—' : `${r.score}%`}</strong>
                          </td>
                          <td>
                            <Badge tone={RESULT_BADGE[r.status].tone}>{RESULT_BADGE[r.status].label}</Badge>
                          </td>
                          <td className="nowrap">{r.lastAttemptOn ? dateTime.format(new Date(r.lastAttemptOn)) : '—'}</td>
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

      {profileId && (
        <CollaboratorProfileDrawer personId={profileId} viewer="manager" onClose={() => setProfileId(null)} onChanged={reload} />
      )}
    </>
  );
}
