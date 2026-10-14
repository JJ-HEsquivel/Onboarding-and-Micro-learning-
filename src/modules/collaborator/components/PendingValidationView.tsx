import { Clock } from 'lucide-react';
import { Badge } from '@/shared/components/Badge';
import { DocumentItem } from '@/shared/components/DocumentItem';
import { EmptyState } from '@/shared/components/EmptyState';
import { PageHeader } from '@/shared/components/PageHeader';
import type { RouteDocument } from '@/shared/types/onboarding';

interface PendingValidationViewProps {
  firstName: string;
  validatorName: string | null;
  proposed: RouteDocument[];
}

/** Lo que ve un colaborador recién registrado mientras su Manager no confirme la documentación. */
export function PendingValidationView({ firstName, validatorName, proposed }: PendingValidationViewProps) {
  const manager = validatorName ?? 'su Manager';
  return (
    <>
      <PageHeader
        title={`Hola, ${firstName}`}
        description={`Su cuenta se creó correctamente. Antes de que pueda ver su documentación, ${manager} tiene que revisarla y confirmarla.`}
      />
      <section className="card">
        <EmptyState
          icon={Clock}
          title="Su ruta de inducción todavía no está activa"
          description={`En cuanto ${manager} confirme los documentos, podrá empezar a leer aquí mismo.`}
        />
        {proposed.length > 0 && (
          <div className="pending-route">
            <h3 className="section-label">Documentación propuesta (sujeta a la revisión del Manager)</h3>
            <ul className="stage-group__items">
              {proposed.map((document) => (
                <li key={document.id}>
                  <DocumentItem document={document} muted actions={<Badge>En validación</Badge>} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </>
  );
}
