import { useCallback } from 'react';
import { Award } from 'lucide-react';
import { useCurrentUser } from '@/app/session/useSession';
import { Alert } from '@/shared/components/Alert';
import { Badge, type BadgeTone } from '@/shared/components/Badge';
import { EmptyState } from '@/shared/components/EmptyState';
import { PageHeader } from '@/shared/components/PageHeader';
import { useAsync } from '@/shared/hooks/useAsync';
import { listEvidence, type EvidenceType } from '@/services/evidence.service';

const TYPE_LABEL: Record<EvidenceType, { label: string; tone: BadgeTone }> = {
  ReadingConfirmation: { label: 'Lectura confirmada', tone: 'info' },
  AssessmentPassed: { label: 'Evaluación aprobada', tone: 'success' },
  AssessmentFailed: { label: 'Evaluación reprobada', tone: 'danger' },
  RoleChange: { label: 'Cambio de rol', tone: 'warning' },
};

const dateTime = new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' });

/** Constancias del colaborador: sus evidencias de lectura, evaluaciones y cambios de rol. */
export default function CollaboratorCertificatesPage() {
  const user = useCurrentUser();
  const load = useCallback(() => listEvidence(user.id), [user.id]);
  const { data, error, loading } = useAsync(load);

  return (
    <>
      <PageHeader title="Mis constancias" description="Evidencia de las lecturas y evaluaciones completadas." />

      {error && <Alert tone="danger">No se pudieron cargar sus constancias. {error.message}</Alert>}
      {loading && !data && <p className="page-loading">Cargando…</p>}

      {data && (
        <section className="card">
          {data.length === 0 ? (
            <EmptyState
              icon={Award}
              title="Todavía no tiene constancias"
              description="Cada lectura confirmada y cada evaluación rendida quedan registradas aquí."
            />
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Detalle</th>
                    <th>Resultado</th>
                    <th>Fecha</th>
                    <th>Huella</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((evidence) => {
                    const type = evidence.type ? TYPE_LABEL[evidence.type] : null;
                    return (
                      <tr key={evidence.id}>
                        <td>{type ? <Badge tone={type.tone}>{type.label}</Badge> : '—'}</td>
                        <td>{evidence.description}</td>
                        <td>{evidence.result}</td>
                        <td className="nowrap">{evidence.date ? dateTime.format(new Date(evidence.date)) : '—'}</td>
                        <td>
                          <code>{evidence.hash}</code>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </>
  );
}
