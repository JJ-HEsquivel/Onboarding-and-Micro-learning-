import { Pencil, Plus } from 'lucide-react';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import type { ManagedDocument, Stage } from '@/shared/types/content';
import type { AssessmentStats } from '@/services/assessmentEditor.service';
import { DOCUMENT_STATUS_LABEL } from '@/modules/admin/content/contentLabels';

interface AssessmentsTableProps {
  documents: ManagedDocument[];
  stages: Stage[];
  /** documentId → su evaluación. */
  stats: Map<string, AssessmentStats>;
  onEdit: (document: ManagedDocument) => void;
}

/** Color de la tasa de aprobación: verde desde 80 %, ámbar desde 60 %, rojo por debajo. */
const passRateTone = (rate: number) => (rate >= 80 ? 'success' : rate >= 60 ? 'warning' : 'danger');

export function AssessmentsTable({ documents, stages, stats, onEdit }: AssessmentsTableProps) {
  const stageName = (id: string | null) => stages.find((s) => s.id === id)?.name ?? '—';

  return (
    <div className="table-wrapper">
      <table className="table">
        <thead>
          <tr>
            <th>Documento</th>
            <th>Etapa</th>
            <th>Preguntas</th>
            <th>Nota mínima</th>
            <th>Intentos</th>
            <th>Duración</th>
            <th>Rendidos</th>
            <th>Aprobación</th>
            <th aria-label="Acciones" />
          </tr>
        </thead>
        <tbody>
          {documents.map((document) => {
            const assessment = stats.get(document.id);
            return (
              <tr key={document.id}>
                <td>
                  <p className="doc-cell__title">{document.title}</p>
                  <p className="doc-cell__meta">
                    {document.code} · v{document.version}
                    {document.status === 'draft' && ` · ${DOCUMENT_STATUS_LABEL.draft.label}`}
                  </p>
                </td>
                <td className="cell-muted">{stageName(document.stageId)}</td>
                <td>
                  {document.questionCount > 0 ? (
                    document.questionCount
                  ) : (
                    <Badge tone="warning">{assessment ? 'Sin preguntas' : 'Sin evaluación'}</Badge>
                  )}
                </td>
                <td>{assessment ? `${assessment.settings.passingScore} %` : '—'}</td>
                <td>{assessment?.settings.maxAttempts ?? '—'}</td>
                <td>{assessment ? `${assessment.settings.durationMinutes} min` : '—'}</td>
                <td>{assessment?.attempts ?? 0}</td>
                <td>
                  {assessment?.passRate != null ? (
                    <Badge tone={passRateTone(assessment.passRate)}>{assessment.passRate} %</Badge>
                  ) : (
                    <span className="cell-muted">—</span>
                  )}
                </td>
                <td>
                  <div className="table-actions">
                    <Button variant="ghost" onClick={() => onEdit(document)}>
                      {assessment ? <Pencil size={15} /> : <Plus size={15} />}
                      {assessment ? 'Editar' : 'Crear'}
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
