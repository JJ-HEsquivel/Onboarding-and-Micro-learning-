import { useCallback, useState, type UIEvent } from 'react';
import { CircleCheck } from 'lucide-react';
import { Alert } from '@/shared/components/Alert';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { Modal } from '@/shared/components/Modal';
import { useAsync } from '@/shared/hooks/useAsync';
import { formatDate } from '@/shared/lib/dates';
import { getDocumentDetail } from '@/services/documents.service';
import type { MyDocument } from '@/services/myInduction.service';
import './induction.css';

interface DocumentReaderModalProps {
  document: MyDocument;
  onClose: () => void;
  /** Confirma la lectura (guarda en Dataverse). */
  onConfirm: (document: MyDocument) => Promise<void>;
  /** Abre el examen del documento. */
  onStartExam: (document: MyDocument) => void;
}

/** Porcentaje desde el que se considera leído el documento (deja margen al final). */
const READ_THRESHOLD = 96;

/** Qué porcentaje del documento ya pasó por la pantalla. */
function readPercentOf(element: HTMLElement): number {
  const { scrollTop, clientHeight, scrollHeight } = element;
  if (scrollHeight <= clientHeight) return 100;
  return Math.min(100, Math.round(((scrollTop + clientHeight) / scrollHeight) * 100));
}

/** Lector del documento: hay que llegar al final para poder confirmar la lectura. */
export function DocumentReaderModal({ document, onClose, onConfirm, onStartExam }: DocumentReaderModalProps) {
  const loadDetail = useCallback(() => getDocumentDetail(document.id), [document.id]);
  const detail = useAsync(loadDetail);
  const [readPercent, setReadPercent] = useState(document.isRead ? 100 : 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  // El avance nunca retrocede: si vuelve hacia arriba, se conserva lo ya leído.
  const updateProgress = useCallback((element: HTMLElement) => {
    setReadPercent((previous) => Math.max(previous, readPercentOf(element)));
  }, []);

  // Si el documento entra entero en pantalla, cuenta como leído al mostrarse.
  const measure = useCallback(
    (element: HTMLDivElement | null) => {
      if (element) updateProgress(element);
    },
    [updateProgress],
  );

  const handleConfirm = async () => {
    setSaving(true);
    setError(null);
    try {
      await onConfirm(document);
      setConfirmed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  if (confirmed) {
    const hasExam = Boolean(document.examAssignmentId);
    return (
      <Modal
        title="Lectura confirmada"
        description={document.title}
        onClose={onClose}
        footer={
          <>
            <Button variant="ghost" onClick={onClose}>
              {hasExam ? 'Más tarde' : 'Cerrar'}
            </Button>
            {hasExam && <Button onClick={() => onStartExam(document)}>Rendir examen ahora</Button>}
          </>
        }
      >
        <div className="result-panel">
          <CircleCheck size={44} className="result-panel__icon result-panel__icon--success" />
          <h3>{hasExam ? 'Ya puede rendir el examen de este documento' : 'Lectura registrada'}</h3>
          <p>
            {hasExam
              ? 'El documento cuenta como aprobado en su ruta cuando apruebe su examen. La lectura quedó registrada como evidencia.'
              : 'La lectura quedó registrada como evidencia.'}
          </p>
        </div>
      </Modal>
    );
  }

  const canConfirm = !document.isRead && readPercent >= READ_THRESHOLD;
  const d = detail.data;

  return (
    <Modal
      title={document.title}
      description={d ? `${d.code} · versión ${d.version} · actualizado el ${formatDate(d.updatedOn)}` : document.code}
      onClose={onClose}
      footer={
        <>
          <div className="reader__progress" aria-live="polite">
            <span className="reader__progress-bar">
              <span style={{ width: `${readPercent}%` }} />
            </span>
            <span>{readPercent}% leído</span>
          </div>
          <Button variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
          {document.isRead ? (
            <Button disabled>Lectura ya confirmada</Button>
          ) : (
            <Button onClick={handleConfirm} disabled={!canConfirm || saving}>
              {saving ? 'Confirmando…' : canConfirm ? 'Confirmar lectura' : 'Desplácese hasta el final'}
            </Button>
          )}
        </>
      }
    >
      {detail.loading && !d && <p className="reader__message">Cargando el documento…</p>}
      {detail.error && <Alert tone="danger">No se pudo cargar el documento. {detail.error.message}</Alert>}
      {error && <Alert tone="danger">No se pudo confirmar la lectura. {error}</Alert>}

      {d && (
        <>
          <div className="reader__meta">
            {d.readingMinutes !== null && <span>{d.readingMinutes} min de lectura</span>}
            {d.pages !== null && <span>{d.pages} páginas</span>}
            {d.owner && <span>Propietario: {d.owner}</span>}
            <Badge tone={d.criticality === 'high' ? 'danger' : 'neutral'}>
              Criticidad {d.criticality === 'high' ? 'alta' : d.criticality === 'low' ? 'baja' : 'media'}
            </Badge>
          </div>
          <div
            className="reader__document"
            ref={measure}
            onScroll={(event: UIEvent<HTMLDivElement>) => updateProgress(event.currentTarget)}
          >
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
      )}
    </Modal>
  );
}
