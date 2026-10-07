import type { ReactNode } from 'react';

interface StageGroupProps {
  name: string;
  /** Texto a la derecha del título (ej. "7 documentos"). */
  summary?: ReactNode;
  children: ReactNode;
}

/** Recuadro de una etapa con su lista de documentos. */
export function StageGroup({ name, summary, children }: StageGroupProps) {
  return (
    <div className="stage-group">
      <div className="stage-group__header">
        <p className="stage-group__name">{name}</p>
        {summary && <span className="stage-group__count">{summary}</span>}
      </div>
      <ul className="stage-group__items">{children}</ul>
    </div>
  );
}
