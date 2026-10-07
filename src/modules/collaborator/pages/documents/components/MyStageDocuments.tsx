import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { DocumentItem } from '@/shared/components/DocumentItem';
import { StageGroup } from '@/shared/components/StageGroup';
import { formatDate, todayIso } from '@/shared/lib/dates';
import type { MyDocument, MyStage } from '@/services/myDocuments.service';

interface MyStageDocumentsProps {
  stage: MyStage;
  /** Asignación que se está confirmando en este momento. */
  confirmingId: string | null;
  onConfirm: (document: MyDocument) => void;
}

/** Documentos de una etapa con su estado y el botón para confirmar la lectura. */
export function MyStageDocuments({ stage, confirmingId, onConfirm }: MyStageDocumentsProps) {
  const read = stage.documents.filter((document) => document.isRead).length;
  const today = todayIso();

  return (
    <section className="card my-documents__stage">
      <StageGroup name={stage.name} summary={`${read} de ${stage.documents.length} leídos`}>
        {stage.documents.map((document) => {
          const isOverdue = !document.isRead && document.dueDate !== null && document.dueDate < today;
          return (
            <li key={document.assignmentId}>
              <DocumentItem
                document={document}
                extraMeta={
                  document.dueDate && (
                    <span className={isOverdue ? 'my-documents__overdue' : undefined}>
                      {isOverdue ? 'Venció' : 'Vence'} {formatDate(document.dueDate)}
                    </span>
                  )
                }
                actions={
                  document.isRead ? (
                    <Badge tone="success">Leído</Badge>
                  ) : (
                    // TODO: abrir el archivo del documento (columna jsi_file) antes de confirmar.
                    <Button
                      variant="secondary"
                      disabled={confirmingId !== null}
                      onClick={() => onConfirm(document)}
                    >
                      {confirmingId === document.assignmentId ? 'Confirmando…' : 'Confirmar lectura'}
                    </Button>
                  )
                }
              />
            </li>
          );
        })}
      </StageGroup>
    </section>
  );
}
