import { useCallback, useState } from 'react';
import { CircleCheck } from 'lucide-react';
import { Alert } from '@/shared/components/Alert';
import { Button } from '@/shared/components/Button';
import { Modal } from '@/shared/components/Modal';
import type { MyDocument } from '@/services/myInduction.service';
import { DocumentContent } from '@/modules/common/components/DocumentContent';
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

/** Lector del colaborador: hay que llegar al final del documento para poder confirmar la lectura. */
export function DocumentReaderModal({ document, onClose, onConfirm, onStartExam }: DocumentReaderModalProps) {
  const [readPercent, setReadPercent] = useState(document.isRead ? 100 : 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  // El avance nunca retrocede: si vuelve hacia arriba, se conserva lo ya leído.
  const handleProgress = useCallback((percent: number) => setReadPercent((prev) => Math.max(prev, percent)), []);

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

  return (
    <Modal
      title={document.title}
      description={`${document.code} · versión ${document.version}`}
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
      {error && <Alert tone="danger">No se pudo confirmar la lectura. {error}</Alert>}
      <DocumentContent documentId={document.id} onProgress={handleProgress} />
    </Modal>
  );
}
