import { useCallback, type UIEvent } from 'react';
import { Alert } from '@/shared/components/Alert';
import { Badge } from '@/shared/components/Badge';
import { useAsync } from '@/shared/hooks/useAsync';
import { getDocumentDetail } from '@/services/documents.service';
import './document.css';

interface DocumentContentProps {
  documentId: string;
  /** Avisa qué porcentaje del documento está leído según el desplazamiento. Debe ser una función estable. */
  onProgress?: (percent: number) => void;
}

/** Qué porcentaje del documento ya pasó por la pantalla. */
function readPercentOf(element: HTMLElement): number {
  const { scrollTop, clientHeight, scrollHeight } = element;
  if (scrollHeight <= clientHeight) return 100;
  return Math.min(100, Math.round(((scrollTop + clientHeight) / scrollHeight) * 100));
}

const CRITICALITY = { high: 'alta', medium: 'media', low: 'baja' } as const;

/** Contenido de un documento: datos, resumen y secciones, con seguimiento del avance de lectura. */
export function DocumentContent({ documentId, onProgress }: DocumentContentProps) {
  const load = useCallback(() => getDocumentDetail(documentId), [documentId]);
  const { data: d, error, loading } = useAsync(load);
  const track = useCallback((element: HTMLElement) => onProgress?.(readPercentOf(element)), [onProgress]);

  // Si el documento entra entero en pantalla, cuenta como leído al mostrarse.
  const measure = useCallback((element: HTMLDivElement | null) => {
    if (element) track(element);
  }, [track]);

  if (loading && !d) return <p className="reader__message">Cargando el documento…</p>;
  if (error) return <Alert tone="danger">No se pudo cargar el documento. {error.message}</Alert>;
  if (!d) return null;

  return (
    <>
      <div className="reader__meta">
        {d.readingMinutes !== null && <span>{d.readingMinutes} min de lectura</span>}
        {d.pages !== null && <span>{d.pages} páginas</span>}
        {d.owner && <span>Propietario: {d.owner}</span>}
        <Badge tone={d.criticality === 'high' ? 'danger' : 'neutral'}>Criticidad {CRITICALITY[d.criticality]}</Badge>
      </div>
      <div className="reader__document" ref={measure} onScroll={(event: UIEvent<HTMLDivElement>) => track(event.currentTarget)}>
        <p className="reader__notice">
          Clasificación: Interna · Este documento es propiedad de Jalasoft. Prohibida su reproducción fuera de la organización.
        </p>
        {d.summary && <p className="reader__summary">{d.summary}</p>}
        {d.sections.map((section, i) => (
          <section key={i}>
            {section.title && <h4>{section.title}</h4>}
            <p>{section.body}</p>
          </section>
        ))}
        {d.sections.length === 0 && <p className="reader__message">Este documento todavía no tiene contenido cargado.</p>}
        <p className="reader__notice">
          Fin del documento · {d.code} v{d.version}
        </p>
      </div>
    </>
  );
}
