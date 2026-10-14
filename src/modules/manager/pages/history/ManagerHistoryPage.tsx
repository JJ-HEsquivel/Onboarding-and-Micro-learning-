import { useCallback } from 'react';
import { Award } from 'lucide-react';
import { useCurrentUser } from '@/app/session/useSession';
import { Alert } from '@/shared/components/Alert';
import { Badge } from '@/shared/components/Badge';
import { DocumentItem } from '@/shared/components/DocumentItem';
import { EmptyState } from '@/shared/components/EmptyState';
import { PageHeader } from '@/shared/components/PageHeader';
import { StageGroup } from '@/shared/components/StageGroup';
import { StatCard } from '@/shared/components/StatCard';
import { useAsync } from '@/shared/hooks/useAsync';
import { formatDate, todayIso } from '@/shared/lib/dates';
import { loadMyInduction } from '@/services/myInduction.service';
import { getPromotionInfo } from '@/services/team.service';
import { documentStatus } from '@/modules/common/documentStatus';
import '../manager.css';

/**
 * Historial de inducción de un Manager que llegó por ascenso: lo que completó como colaborador,
 * en solo lectura. Como Manager no tiene documentos ni evaluaciones pendientes.
 */
export default function ManagerHistoryPage() {
  const user = useCurrentUser();
  const load = useCallback(async () => {
    const [induction, promotion] = await Promise.all([loadMyInduction(user.id), getPromotionInfo(user.id)]);
    return { induction, promotion };
  }, [user.id]);
  const { data, error, loading } = useAsync(load);
  const today = todayIso();

  const induction = data?.induction;
  const active = induction?.state === 'active' ? induction : null;
  const promotion = data?.promotion ?? null;

  return (
    <>
      <PageHeader
        title="Historial de inducción"
        description="Lo que completó como colaborador antes de su ascenso. Como Manager no tiene documentos ni evaluaciones pendientes."
      />

      <div className="manager-page">
        {error && <Alert tone="danger">No se pudo cargar su historial. {error.message}</Alert>}
        {loading && !data && <p className="page-loading">Cargando…</p>}

        {data && !active && (
          <section className="card">
            <EmptyState
              icon={Award}
              title="Sin historial de inducción"
              description="Su cuenta de Manager no tiene una inducción registrada en la plataforma."
            />
          </section>
        )}

        {active && (
          <>
            <div className="manager-page__stats">
              <StatCard
                label="Documentos aprobados"
                value={`${active.progress.approved}/${active.progress.total}`}
                caption="Al momento de su ascenso"
              />
              <StatCard
                label="Promedio de exámenes"
                value={active.progress.averageScore === null ? '—' : `${active.progress.averageScore}%`}
                caption="Evaluaciones rendidas"
              />
              <StatCard label="Inducción cerrada" value={formatDate(active.completedOn)} caption={`Inicio el ${formatDate(active.startDate)}`} />
              <StatCard
                label="Ascendido a Manager"
                value={formatDate(promotion?.promotedOn)}
                caption={promotion?.previousJobTitle ? `Antes: ${promotion.previousJobTitle}` : 'Cuenta base'}
              />
            </div>

            {active.stages.map((stage) => (
              <section key={stage.id} className="card manager-page__panel">
                <StageGroup name={stage.name} summary="Solo lectura">
                  {stage.documents.map((d) => {
                    const status = documentStatus(d, today);
                    return (
                      <li key={d.assignmentId}>
                        <DocumentItem
                          document={d}
                          extraMeta={d.confirmedOn ? <span>Lectura confirmada el {formatDate(d.confirmedOn)}</span> : undefined}
                          actions={<Badge tone={status.tone}>{status.label}</Badge>}
                        />
                      </li>
                    );
                  })}
                </StageGroup>
              </section>
            ))}
          </>
        )}
      </div>
    </>
  );
}
