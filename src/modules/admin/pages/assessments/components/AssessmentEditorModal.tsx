import { useCallback, useMemo, useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import { Alert } from '@/shared/components/Alert';
import { Button } from '@/shared/components/Button';
import { FormField } from '@/shared/components/FormField';
import { Modal } from '@/shared/components/Modal';
import {
  planQuestionChanges,
  validateQuestions,
  type DraftQuestion,
  type SavedQuestion,
} from '@/shared/domain/assessmentChanges';
import { useAsync } from '@/shared/hooks/useAsync';
import { pluralize } from '@/shared/lib/format';
import type { ManagedDocument } from '@/shared/types/content';
import { DEFAULT_SETTINGS, loadQuestions, saveAssessment, type AssessmentStats } from '@/services/assessmentEditor.service';
import { parseOptionalInt } from '@/modules/admin/content/contentLabels';
import { QuestionCard } from './QuestionCard';

interface AssessmentEditorModalProps {
  document: ManagedDocument;
  /** Evaluación actual del documento, o undefined si todavía no tiene. */
  stats?: AssessmentStats;
  onClose: () => void;
  onSaved: (message: string) => void;
}

/** Primero lee las preguntas guardadas; recién entonces muestra el editor con ellas. */
export function AssessmentEditorModal(props: AssessmentEditorModalProps) {
  const assessmentId = props.stats?.assessmentId ?? null;
  const loader = useCallback(() => (assessmentId ? loadQuestions(assessmentId) : Promise.resolve([])), [assessmentId]);
  const saved = useAsync(loader);

  if (!saved.data) {
    return (
      <Modal title={`Evaluación · ${props.document.title}`} onClose={props.onClose}>
        {saved.error ? (
          <Alert tone="danger">No se pudieron leer las preguntas. {saved.error.message}</Alert>
        ) : (
          <p className="cell-muted">Cargando preguntas…</p>
        )}
      </Modal>
    );
  }
  return <AssessmentEditor {...props} saved={saved.data} />;
}

/** Una pregunta del editor con una clave estable para React (no cambia al reordenar). */
type EditorQuestion = DraftQuestion & { key: string };

interface SettingsForm {
  passingScore: string;
  maxAttempts: string;
  durationMinutes: string;
}

const FORM_ID = 'assessment-form';

const emptyQuestion = (key: string): EditorQuestion => ({
  key,
  id: null,
  text: '',
  explanation: '',
  options: [
    { text: '', isCorrect: true },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
  ],
});

function validateSettings(form: SettingsForm): Partial<Record<keyof SettingsForm, string>> {
  const inRange = (text: string, min: number, max: number) => {
    const value = parseOptionalInt(text);
    return value !== null && !Number.isNaN(value) && value >= min && value <= max;
  };
  const errors: Partial<Record<keyof SettingsForm, string>> = {};
  if (!inRange(form.passingScore, 1, 100)) errors.passingScore = 'Entre 1 y 100.';
  if (!inRange(form.maxAttempts, 1, 10)) errors.maxAttempts = 'Entre 1 y 10.';
  if (!inRange(form.durationMinutes, 1, 180)) errors.durationMinutes = 'Entre 1 y 180.';
  return errors;
}

function AssessmentEditor({ document, stats, saved, onClose, onSaved }: AssessmentEditorModalProps & { saved: SavedQuestion[] }) {
  const settings = stats?.settings ?? DEFAULT_SETTINGS;
  const [settingsForm, setSettingsForm] = useState<SettingsForm>({
    passingScore: String(settings.passingScore),
    maxAttempts: String(settings.maxAttempts),
    durationMinutes: String(settings.durationMinutes),
  });
  const [questions, setQuestions] = useState<EditorQuestion[]>(() =>
    saved.map((q) => ({ key: q.id, id: q.id, text: q.text, explanation: q.explanation, options: q.options.map(({ text, isCorrect }) => ({ text, isCorrect })) })),
  );
  const [nextKey, setNextKey] = useState(1);
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const answeredIds = useMemo(() => new Set(saved.filter((q) => q.answered).map((q) => q.id)), [saved]);
  const settingsErrors = showErrors ? validateSettings(settingsForm) : {};
  const questionErrors = showErrors ? validateQuestions(questions) : [];
  const noQuestionsError = showErrors && questions.length === 0;

  // Resumen de lo que se hará al guardar (la misma función que usa el servicio).
  const plan = useMemo(() => planQuestionChanges(saved, questions), [saved, questions]);
  const count = (...kinds: string[]) => plan.filter((c) => kinds.includes(c.kind)).length;

  const updateQuestion = (index: number, question: DraftQuestion) =>
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...question, key: q.key } : q)));

  const moveQuestion = (index: number, direction: -1 | 1) =>
    setQuestions((prev) => {
      const next = [...prev];
      [next[index], next[index + direction]] = [next[index + direction], next[index]];
      return next;
    });

  const addQuestion = () => {
    setQuestions((prev) => [...prev, emptyQuestion(`new-${nextKey}`)]);
    setNextKey((value) => value + 1);
  };

  const handleClose = useCallback(() => {
    if (!saving) onClose();
  }, [saving, onClose]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setShowErrors(true);
    const invalid =
      Object.keys(validateSettings(settingsForm)).length > 0 ||
      questions.length === 0 ||
      validateQuestions(questions).some(Boolean);
    if (invalid) return;

    setSaving(true);
    setSaveError(null);
    try {
      await saveAssessment({
        document: { id: document.id, title: document.title, stageId: document.stageId },
        assessmentId: stats?.assessmentId ?? null,
        settings: {
          passingScore: Number(settingsForm.passingScore),
          maxAttempts: Number(settingsForm.maxAttempts),
          durationMinutes: Number(settingsForm.durationMinutes),
        },
        saved,
        drafts: questions,
      });
      onSaved(`Se guardó la evaluación de «${document.title}» con ${pluralize(questions.length, 'pregunta', 'preguntas')}.`);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error));
      setSaving(false);
    }
  };

  return (
    <Modal
      title={`Evaluación · ${document.title}`}
      description={`${document.code} · v${document.version}${stats ? ` · ${pluralize(stats.attempts, 'intento rendido', 'intentos rendidos')}` : ' · todavía no tiene evaluación'}`}
      onClose={handleClose}
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar evaluación'}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} className="content-form" onSubmit={handleSubmit} noValidate>
        <div className="assessment-settings">
          <FormField label="Nota mínima (%)" htmlFor="assessment-score" error={settingsErrors.passingScore}>
            <input
              id="assessment-score"
              className="input"
              inputMode="numeric"
              value={settingsForm.passingScore}
              disabled={saving}
              onChange={(e) => setSettingsForm((prev) => ({ ...prev, passingScore: e.target.value }))}
            />
          </FormField>
          <FormField label="Intentos" htmlFor="assessment-attempts" error={settingsErrors.maxAttempts}>
            <input
              id="assessment-attempts"
              className="input"
              inputMode="numeric"
              value={settingsForm.maxAttempts}
              disabled={saving}
              onChange={(e) => setSettingsForm((prev) => ({ ...prev, maxAttempts: e.target.value }))}
            />
          </FormField>
          <FormField label="Duración (min)" htmlFor="assessment-duration" error={settingsErrors.durationMinutes}>
            <input
              id="assessment-duration"
              className="input"
              inputMode="numeric"
              value={settingsForm.durationMinutes}
              disabled={saving}
              onChange={(e) => setSettingsForm((prev) => ({ ...prev, durationMinutes: e.target.value }))}
            />
          </FormField>
        </div>

        {!stats && (
          <Alert tone="warning">
            La evaluación nueva se asigna a quienes reciban este documento desde ahora (al validar su ruta o cuando su Manager se lo
            sume). Las rutas ya validadas no la incluyen.
          </Alert>
        )}

        <h3 className="section-label">Preguntas ({questions.length})</h3>
        {noQuestionsError && <p className="form-field__error">Agregue al menos una pregunta.</p>}
        <ol className="question-list">
          {questions.map((question, index) => (
            <QuestionCard
              key={question.key}
              idPrefix={`q-${question.key}`}
              index={index}
              total={questions.length}
              question={question}
              answered={question.id !== null && answeredIds.has(question.id)}
              error={questionErrors[index] || undefined}
              disabled={saving}
              onChange={(q) => updateQuestion(index, q)}
              onMove={(direction) => moveQuestion(index, direction)}
              onRemove={() => setQuestions((prev) => prev.filter((_, i) => i !== index))}
            />
          ))}
        </ol>
        <div>
          <Button variant="secondary" onClick={addQuestion} disabled={saving}>
            <Plus size={16} />
            Agregar pregunta
          </Button>
        </div>

        {plan.length > 0 && (
          <p className="assessment-plan">
            Al guardar: {count('create', 'replace')} nuevas · {count('update')} editadas · {count('reorder')} reordenadas ·{' '}
            {count('archive', 'replace')} archivadas (ya respondidas) · {count('delete')} eliminadas.
          </p>
        )}

        {saveError && (
          <Alert tone="danger">
            No se pudo guardar completa la evaluación. {saveError} Cierre y vuelva a abrir el editor para ver lo que sí se guardó.
          </Alert>
        )}
      </form>
    </Modal>
  );
}
