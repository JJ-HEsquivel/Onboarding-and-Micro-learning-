import { useState } from 'react';
import { confirmReading, type MyDocument } from '@/services/myInduction.service';
import { DocumentReaderModal } from '../components/DocumentReaderModal';
import { ExamModal } from '../components/ExamModal';

type Dialog = { kind: 'reader' | 'exam'; document: MyDocument } | null;

interface Options {
  personId: string;
  onboardingId: string;
  /** Recarga la ruta después de confirmar una lectura o rendir un examen. */
  reload: () => void;
}

/**
 * Lector y examen de los documentos de la ruta. Devuelve las funciones para abrirlos
 * y el elemento a renderizar en la pantalla.
 */
export function useDocumentDialogs({ personId, onboardingId, reload }: Options) {
  const [dialog, setDialog] = useState<Dialog>(null);
  const close = () => setDialog(null);
  const openReader = (document: MyDocument) => setDialog({ kind: 'reader', document });
  const openExam = (document: MyDocument) => setDialog({ kind: 'exam', document });

  const handleConfirmReading = async (document: MyDocument) => {
    await confirmReading(personId, onboardingId, document);
    reload();
  };

  const element =
    dialog?.kind === 'reader' ? (
      <DocumentReaderModal document={dialog.document} onClose={close} onConfirm={handleConfirmReading} onStartExam={openExam} />
    ) : dialog?.kind === 'exam' ? (
      <ExamModal
        document={dialog.document}
        personId={personId}
        onboardingId={onboardingId}
        onClose={close}
        onSubmitted={reload}
        onReread={openReader}
      />
    ) : null;

  return { openReader, openExam, dialogs: element };
}
