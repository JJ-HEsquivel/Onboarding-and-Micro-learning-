import { useCallback, useEffect, useRef, useState } from 'react';
import { Clock, RotateCcw } from 'lucide-react';
import { Alert } from '@/shared/components/Alert';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { Modal } from '@/shared/components/Modal';
import { ProgressRing } from '@/shared/components/ProgressRing';
import { useAsync } from '@/shared/hooks/useAsync';
import { loadExam, submitExam, type Exam, type ExamResult } from '@/services/exam.service';
import type { MyDocument } from '@/services/myInduction.service';
import './induction.css';

interface ExamModalProps {
  document: MyDocument;
  personId: string;
  onboardingId: string;
  onClose: () => void;
  /** Se llama después de cada intento registrado, para recargar la ruta. */
  onSubmitted: () => void;
  /** Vuelve a abrir el documento para releerlo. */
  onReread: (document: MyDocument) => void;
}

type Phase = 'answering' | 'submitting' | 'result';

const formatClock = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

const optionLetter = (index: number) => String.fromCharCode(65 + index);

/** Examen de un documento: una pregunta por pantalla, con tiempo límite. */
export function ExamModal({ document, personId, onboardingId, onClose, onSubmitted, onReread }: ExamModalProps) {
  const assessmentId = document.assessmentId;
  const load = useCallback(() => {
    if (!assessmentId) return Promise.reject(new Error('Este documento no tiene examen.'));
    return loadExam(assessmentId);
  }, [assessmentId]);
  const examData = useAsync(load);
  const exam = examData.data;

  if (examData.loading && !exam) {
    return (
      <Modal title={document.title} description="Preparando el examen…" onClose={onClose}>
        <p className="reader__message">Cargando preguntas…</p>
      </Modal>
    );
  }
  if (examData.error || !exam) {
    return (
      <Modal title={document.title} onClose={onClose}>
        <Alert tone="danger">No se pudo cargar el examen. {examData.error?.message}</Alert>
      </Modal>
    );
  }
  if (exam.questions.length === 0) {
    return (
      <Modal title={document.title} onClose={onClose}>
        <Alert tone="warning">Este examen todavía no tiene preguntas cargadas.</Alert>
      </Modal>
    );
  }

  return (
    <ExamSession
      exam={exam}
      document={document}
      personId={personId}
      onboardingId={onboardingId}
      onClose={onClose}
      onSubmitted={onSubmitted}
      onReread={onReread}
    />
  );
}

interface ExamSessionProps extends Omit<ExamModalProps, 'document'> {
  exam: Exam;
  document: MyDocument;
}

/** Un examen ya cargado: respuestas, tiempo, envío y resultado. */
function ExamSession({ exam, document, personId, onboardingId, onClose, onSubmitted, onReread }: ExamSessionProps) {
  const totalSeconds = exam.durationMinutes * 60;
  const [phase, setPhase] = useState<Phase>('answering');
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(string | null)[]>(() => exam.questions.map(() => null));
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const [attemptsUsed, setAttemptsUsed] = useState(document.exam?.attemptsUsed ?? 0);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const elapsed = useRef(0);

  const finish = useCallback(
    async (byTimeout: boolean) => {
      if (!document.examAssignmentId) return;
      setPhase('submitting');
      setTimedOut(byTimeout);
      setError(null);
      try {
        const outcome = await submitExam({
          personId,
          onboardingId,
          examAssignmentId: document.examAssignmentId,
          attemptsUsed,
          exam,
          answers,
          durationSeconds: elapsed.current,
          documentId: document.id,
          documentVersion: document.version,
        });
        setResult(outcome);
        setAttemptsUsed(outcome.attemptNumber);
        setPhase('result');
        onSubmitted();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setPhase('answering');
      }
    },
    [answers, attemptsUsed, document, exam, onSubmitted, onboardingId, personId],
  );

  // El temporizador llama siempre a la versión más reciente de finish (con las últimas respuestas).
  const finishRef = useRef(finish);
  useEffect(() => {
    finishRef.current = finish;
  });

  useEffect(() => {
    if (phase !== 'answering') return;
    const timer = setInterval(() => {
      elapsed.current += 1;
      setSecondsLeft((value) => Math.max(0, value - 1));
      if (elapsed.current >= totalSeconds) {
        clearInterval(timer);
        void finishRef.current(true);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, totalSeconds]);

  const retry = () => {
    elapsed.current = 0;
    setAnswers(exam.questions.map(() => null));
    setIndex(0);
    setSecondsLeft(totalSeconds);
    setResult(null);
    setTimedOut(false);
    setPhase('answering');
  };

  if (phase === 'result' && result) {
    return (
      <Modal
        title="Resultado de la evaluación"
        description={exam.title}
        onClose={onClose}
        footer={
          <>
            {!result.passed && result.attemptsLeft > 0 && (
              <Button variant="secondary" onClick={retry}>
                <RotateCcw size={16} />
                Reintentar
              </Button>
            )}
            {!result.passed && (
              <Button variant="secondary" onClick={() => onReread(document)}>
                Releer el documento
              </Button>
            )}
            <Button onClick={onClose}>Entendido</Button>
          </>
        }
      >
        <div className="result-panel">
          <ProgressRing
            value={result.score}
            size={132}
            label={result.passed ? 'aprobado' : 'no aprobado'}
            tone={result.passed ? 'success' : 'danger'}
          />
          <h3>{result.passed ? 'Evaluación aprobada' : timedOut ? 'Tiempo agotado' : 'No alcanzó el mínimo'}</h3>
          <p>
            {result.passed
              ? `Su comprensión quedó verificada y registrada como evidencia. ${document.title} ya cuenta como aprobado en su ruta.`
              : result.attemptsLeft > 0
                ? `Necesita ${exam.passingScore}% para aprobar. Revise el documento y vuelva a intentarlo: le quedan ${result.attemptsLeft} intento(s).`
                : `Necesita ${exam.passingScore}% para aprobar y ya usó los ${exam.maxAttempts} intentos. Su Manager puede habilitarle uno nuevo.`}
          </p>
          <div className="result-panel__stats">
            <div>
              <strong>
                {result.correct}/{result.total}
              </strong>
              <small>Respuestas correctas</small>
            </div>
            <div>
              <strong>{result.score}%</strong>
              <small>Puntaje obtenido</small>
            </div>
            <div>
              <strong>{exam.passingScore}%</strong>
              <small>Mínimo exigido</small>
            </div>
          </div>
        </div>

        <h4 className="exam-review__title">Revisión de sus respuestas</h4>
        <ol className="exam-review">
          {exam.questions.map((question, i) => {
            const chosen = answers[i];
            const isCorrect = question.options.some((o) => o.id === chosen && o.isCorrect);
            return (
              <li key={question.id} className="exam-review__item">
                <div className="exam-review__head">
                  <strong>{question.text}</strong>
                  <Badge tone={isCorrect ? 'success' : 'danger'}>{isCorrect ? 'Correcta' : 'Incorrecta'}</Badge>
                </div>
                <ol type="A" className="exam-review__options">
                  {question.options.map((option) => (
                    <li key={option.id} className={option.isCorrect ? 'exam-review__option--correct' : undefined}>
                      {option.text}
                      {option.isCorrect && ' · correcta'}
                      {option.id === chosen && !isCorrect && ' · su respuesta'}
                    </li>
                  ))}
                </ol>
                {question.explanation && (
                  <p className="exam-review__explanation">
                    <strong>Justificación:</strong> {question.explanation}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      </Modal>
    );
  }

  const question = exam.questions[index];
  const isLast = index === exam.questions.length - 1;
  const submitting = phase === 'submitting';

  return (
    <Modal
      title={exam.title}
      description={`Pregunta ${index + 1} de ${exam.questions.length} · mínimo ${exam.passingScore}% para aprobar · intento ${attemptsUsed + 1} de ${exam.maxAttempts}`}
      // Cerrar a mitad del examen no registra el intento.
      onClose={submitting ? () => undefined : onClose}
      footer={
        <>
          <span className="exam__note">Sus respuestas se registran como evidencia de cumplimiento.</span>
          {index > 0 && (
            <Button variant="secondary" onClick={() => setIndex(index - 1)} disabled={submitting}>
              Anterior
            </Button>
          )}
          <Button
            onClick={() => (isLast ? void finish(false) : setIndex(index + 1))}
            disabled={answers[index] === null || submitting}
          >
            {submitting ? 'Enviando…' : isLast ? 'Finalizar evaluación' : 'Siguiente'}
          </Button>
        </>
      }
    >
      <div className="exam__bar">
        <div className="exam__steps" aria-hidden="true">
          {exam.questions.map((q, i) => (
            <span key={q.id} className={i < index ? 'is-done' : i === index ? 'is-current' : undefined} />
          ))}
        </div>
        <span className={`exam__timer${secondsLeft < 60 ? ' exam__timer--low' : ''}`}>
          <Clock size={16} />
          {formatClock(secondsLeft)}
        </span>
      </div>

      {error && <Alert tone="danger">No se pudo registrar el intento. {error}</Alert>}

      <h3 className="exam__question">{question.text}</h3>
      <div className="exam__options" role="radiogroup" aria-label="Opciones de respuesta">
        {question.options.map((option, i) => {
          const selected = answers[index] === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected}
              className={`exam__option${selected ? ' exam__option--selected' : ''}`}
              disabled={submitting}
              onClick={() => setAnswers((prev) => prev.map((value, j) => (j === index ? option.id : value)))}
            >
              <span className="exam__option-key">{optionLetter(i)}</span>
              <span>{option.text}</span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
