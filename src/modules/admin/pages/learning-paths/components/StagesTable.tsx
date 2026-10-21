import { Pencil } from 'lucide-react';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import type { Stage } from '@/shared/types/content';
import type { Area } from '@/shared/types/onboarding';
import { stageScopeLabel } from '@/modules/admin/content/contentLabels';

interface StagesTableProps {
  stages: Stage[];
  areas: Area[];
  /** stageId → documentos publicados de la etapa. */
  documentCount: Map<string, number>;
  onEdit: (stage: Stage) => void;
}

export function StagesTable({ stages, areas, documentCount, onEdit }: StagesTableProps) {
  return (
    <div className="table-wrapper">
      <table className="table">
        <thead>
          <tr>
            <th>Orden</th>
            <th>Etapa</th>
            <th>Alcance</th>
            <th>Plazo</th>
            <th>Documentos</th>
            <th aria-label="Acciones" />
          </tr>
        </thead>
        <tbody>
          {stages.map((stage) => (
            <tr key={stage.id}>
              <td>{stage.order}</td>
              <td className="doc-cell__title">{stage.name}</td>
              <td>
                <Badge tone={stage.isGeneral ? 'info' : 'neutral'}>{stage.isGeneral ? 'General' : 'Por área'}</Badge>{' '}
                <span className="doc-cell__meta">{stage.isGeneral ? 'todas las áreas' : stageScopeLabel(stage, areas)}</span>
              </td>
              <td className="cell-muted">{stage.businessDays === null ? 'Sin plazo' : `${stage.businessDays} días hábiles`}</td>
              <td>{documentCount.get(stage.id) ?? 0}</td>
              <td>
                <div className="table-actions">
                  <Button variant="ghost" onClick={() => onEdit(stage)}>
                    <Pencil size={15} />
                    Editar
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
