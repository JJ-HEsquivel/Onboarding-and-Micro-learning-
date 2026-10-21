import { FilePlus2, History, Pencil } from 'lucide-react';
import { Link } from 'react-router';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { formatDate } from '@/shared/lib/dates';
import { pluralize } from '@/shared/lib/format';
import type { DocumentCategory, ManagedDocument, Stage } from '@/shared/types/content';
import { CRITICALITY_LABEL, DOCUMENT_STATUS_LABEL } from '@/modules/admin/content/contentLabels';

interface DocumentsTableProps {
  documents: ManagedDocument[];
  stages: Stage[];
  categories: DocumentCategory[];
  onEdit: (document: ManagedDocument) => void;
  onNewVersion: (document: ManagedDocument) => void;
  onHistory: (document: ManagedDocument) => void;
}

export function DocumentsTable({ documents, stages, categories, onEdit, onNewVersion, onHistory }: DocumentsTableProps) {
  const stageName = (id: string | null) => stages.find((s) => s.id === id)?.name ?? '—';
  const categoryName = (id: string | null) => categories.find((c) => c.id === id)?.name;

  return (
    <div className="table-wrapper">
      <table className="table">
        <thead>
          <tr>
            <th>Documento</th>
            <th>Etapa</th>
            <th>Versión</th>
            <th>Estado</th>
            <th>Criticidad</th>
            <th>Evaluación</th>
            <th>Actualizado</th>
            <th aria-label="Acciones" />
          </tr>
        </thead>
        <tbody>
          {documents.map((document) => {
            const status = DOCUMENT_STATUS_LABEL[document.status];
            const criticality = CRITICALITY_LABEL[document.criticality];
            const category = categoryName(document.categoryId);
            return (
              <tr key={document.id}>
                <td>
                  <p className="doc-cell__title">{document.title}</p>
                  <p className="doc-cell__meta">
                    {document.code}
                    {category && ` · ${category}`}
                    {document.readingMinutes !== null && ` · ${document.readingMinutes} min`}
                  </p>
                </td>
                <td className="cell-muted">{stageName(document.stageId)}</td>
                <td>v{document.version}</td>
                <td>
                  <Badge tone={status.tone}>{status.label}</Badge>
                </td>
                <td>
                  <Badge tone={criticality.tone}>{criticality.label}</Badge>
                </td>
                <td>
                  {/* Abre el editor de la evaluación de este documento. */}
                  <Link to={`../evaluaciones?documento=${document.id}`}>
                    {document.questionCount > 0 ? (
                      pluralize(document.questionCount, 'pregunta', 'preguntas')
                    ) : (
                      <Badge tone="warning">Sin preguntas</Badge>
                    )}
                  </Link>
                </td>
                <td className="cell-muted">{formatDate(document.updatedOn)}</td>
                <td>
                  <div className="table-actions">
                    <Button variant="ghost" onClick={() => onEdit(document)} title="Editar datos y contenido">
                      <Pencil size={15} />
                      Editar
                    </Button>
                    <Button variant="ghost" onClick={() => onNewVersion(document)} title="Publicar una versión nueva">
                      <FilePlus2 size={15} />
                      Versión
                    </Button>
                    <Button variant="ghost" onClick={() => onHistory(document)} aria-label={`Historial de ${document.title}`} title="Historial de versiones">
                      <History size={15} />
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
