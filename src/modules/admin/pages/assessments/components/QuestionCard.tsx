import { ArrowDown, ArrowUp, Plus, Trash2, X } from 'lucide-react';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { MAX_OPTIONS, MIN_OPTIONS, type DraftQuestion } from '@/shared/domain/assessmentChanges';

interface QuestionCardProps {
  /** Prefijo único para los id de los campos. */
  idPrefix: string;
  index: number;
  total: number;
  question: DraftQuestion;
  /** true si alguien ya respondió la pregunta guardada de la que proviene. */
  answered: boolean;
  error?: string;
  disabled?: boolean;
  onChange: (question: DraftQuestion) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}

/** Edición de una pregunta: enunciado, opciones (con la correcta marcada) y explicación. */
export function QuestionCard({ idPrefix, index, total, question, answered, error, disabled, onChange, onMove, onRemove }: QuestionCardProps) {
  const setOptions = (options: DraftQuestion['options']) => onChange({ ...question, options });

  return (
    <li className={`question-card${error ? ' question-card--invalid' : ''}`}>
      <div className="question-card__header">
        <span className="question-card__number">{index + 1}</span>
        {answered && (
          <Badge tone="warning">Ya respondida: si la cambia, se archiva y se crea una nueva</Badge>
        )}
        <div className="question-card__tools">
          <Button variant="ghost" onClick={() => onMove(-1)} disabled={disabled || index === 0} aria-label="Subir pregunta">
            <ArrowUp size={15} />
          </Button>
          <Button variant="ghost" onClick={() => onMove(1)} disabled={disabled || index === total - 1} aria-label="Bajar pregunta">
            <ArrowDown size={15} />
          </Button>
          <Button variant="ghost" onClick={onRemove} disabled={disabled} aria-label="Quitar pregunta">
            <Trash2 size={15} />
          </Button>
        </div>
      </div>

      <label className="visually-hidden" htmlFor={`${idPrefix}-text`}>
        Enunciado de la pregunta {index + 1}
      </label>
      <textarea
        id={`${idPrefix}-text`}
        className="input"
        rows={2}
        maxLength={500}
        placeholder="Enunciado de la pregunta"
        value={question.text}
        disabled={disabled}
        onChange={(e) => onChange({ ...question, text: e.target.value })}
      />

      <p className="question-card__hint">Marque la opción correcta:</p>
      <ul className="question-card__options">
        {question.options.map((option, optionIndex) => (
          <li key={optionIndex} className="question-card__option">
            <input
              type="radio"
              name={`${idPrefix}-correct`}
              aria-label={`Opción ${optionIndex + 1} es la correcta`}
              checked={option.isCorrect}
              disabled={disabled}
              onChange={() => setOptions(question.options.map((o, i) => ({ ...o, isCorrect: i === optionIndex })))}
            />
            <input
              className="input"
              maxLength={300}
              placeholder={`Opción ${optionIndex + 1}`}
              aria-label={`Texto de la opción ${optionIndex + 1}`}
              value={option.text}
              disabled={disabled}
              onChange={(e) => setOptions(question.options.map((o, i) => (i === optionIndex ? { ...o, text: e.target.value } : o)))}
            />
            <Button
              variant="ghost"
              aria-label={`Quitar opción ${optionIndex + 1}`}
              disabled={disabled || question.options.length <= MIN_OPTIONS}
              onClick={() => setOptions(question.options.filter((_, i) => i !== optionIndex))}
            >
              <X size={15} />
            </Button>
          </li>
        ))}
      </ul>
      {question.options.length < MAX_OPTIONS && (
        <Button variant="ghost" disabled={disabled} onClick={() => setOptions([...question.options, { text: '', isCorrect: false }])}>
          <Plus size={15} />
          Agregar opción
        </Button>
      )}

      <label className="visually-hidden" htmlFor={`${idPrefix}-explanation`}>
        Explicación de la pregunta {index + 1}
      </label>
      <textarea
        id={`${idPrefix}-explanation`}
        className="input"
        rows={2}
        maxLength={2000}
        placeholder="Explicación (opcional): se muestra al revisar el examen"
        value={question.explanation}
        disabled={disabled}
        onChange={(e) => onChange({ ...question, explanation: e.target.value })}
      />

      {error && <p className="form-field__error">{error}</p>}
    </li>
  );
}
