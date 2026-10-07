import type { ReactNode } from 'react';
import { FileText } from 'lucide-react';
import type { RouteDocument } from '@/shared/types/onboarding';

interface DocumentItemProps {
  document: RouteDocument;
  /** Contenido antes del ícono (ej. una casilla). */
  leading?: ReactNode;
  /** Datos extra en la línea de detalle (ej. vencimiento). */
  extraMeta?: ReactNode;
  /** Contenido a la derecha (etiquetas, botones). */
  actions?: ReactNode;
  muted?: boolean;
  /** Si se indica, toda la fila es un <label> (para casillas). */
  htmlFor?: string;
}

/** Fila de un documento: ícono (con punto si es crítico), título, código, versión y minutos. */
export function DocumentItem({ document, leading, extraMeta, actions, muted, htmlFor }: DocumentItemProps) {
  const className = ['doc-item', muted && 'doc-item--muted', htmlFor && 'doc-item--selectable'].filter(Boolean).join(' ');
  const content = (
    <>
      {leading}
      <span className={`doc-item__icon${document.isCritical ? ' doc-item__icon--critical' : ''}`}>
        <FileText size={16} />
        {document.isCritical && <span className="visually-hidden">Criticidad alta</span>}
      </span>
      <span className="doc-item__info">
        <span className="doc-item__title">{document.title}</span>
        <span className="doc-item__meta">
          <span>{document.code}</span>
          <span>v{document.version}</span>
          {document.readingMinutes !== null && <span>{document.readingMinutes} min</span>}
          {extraMeta}
        </span>
      </span>
      {actions && <span className="doc-item__actions">{actions}</span>}
    </>
  );

  return htmlFor ? (
    <label className={className} htmlFor={htmlFor}>
      {content}
    </label>
  ) : (
    <div className={className}>{content}</div>
  );
}
