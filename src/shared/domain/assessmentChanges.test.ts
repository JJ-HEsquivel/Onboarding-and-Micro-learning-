import { describe, expect, it } from 'vitest';
import { planQuestionChanges, validateQuestions, type DraftQuestion, type SavedQuestion } from './assessmentChanges';

const saved = (id: string, order: number, answered: boolean): SavedQuestion => ({
  id,
  text: `Pregunta ${id}`,
  explanation: '',
  order,
  answered,
  options: [
    { id: `${id}-a`, text: 'Correcta', isCorrect: true },
    { id: `${id}-b`, text: 'Incorrecta', isCorrect: false },
  ],
});

/** La pregunta tal como la deja el editor, sin cambios salvo los indicados. */
const draftOf = (question: SavedQuestion, changes: Partial<DraftQuestion> = {}): DraftQuestion => ({
  id: question.id,
  text: question.text,
  explanation: question.explanation,
  options: question.options.map(({ text, isCorrect }) => ({ text, isCorrect })),
  ...changes,
});

describe('planQuestionChanges', () => {
  const answered = saved('q1', 1, true);
  const unanswered = saved('q2', 2, false);

  it('sin cambios no hace nada', () => {
    expect(planQuestionChanges([answered, unanswered], [draftOf(answered), draftOf(unanswered)])).toEqual([]);
  });

  it('una pregunta ya respondida y editada se archiva y se crea otra (nunca se modifica)', () => {
    const plan = planQuestionChanges([answered], [draftOf(answered, { text: 'Otra redacción' })]);
    expect(plan).toEqual([{ kind: 'replace', id: 'q1', order: 1, question: expect.objectContaining({ text: 'Otra redacción' }) }]);
  });

  it('una pregunta sin respuestas se edita en el lugar y se reemplazan sus opciones', () => {
    const plan = planQuestionChanges([unanswered], [draftOf(unanswered, { explanation: 'Nueva explicación' })]);
    expect(plan).toEqual([expect.objectContaining({ kind: 'update', id: 'q2', optionIdsToDelete: ['q2-a', 'q2-b'] })]);
  });

  it('al quitarlas: la respondida se archiva y la otra se borra con sus opciones', () => {
    expect(planQuestionChanges([answered, unanswered], [])).toEqual([
      { kind: 'archive', id: 'q1' },
      { kind: 'delete', id: 'q2', optionIdsToDelete: ['q2-a', 'q2-b'] },
    ]);
  });

  it('cambiar solo el orden no reemplaza preguntas', () => {
    expect(planQuestionChanges([answered, unanswered], [draftOf(unanswered), draftOf(answered)])).toEqual([
      { kind: 'reorder', id: 'q2', order: 1 },
      { kind: 'reorder', id: 'q1', order: 2 },
    ]);
  });

  it('una pregunta nueva se crea en su posición', () => {
    const fresh: DraftQuestion = { id: null, text: 'Nueva', explanation: '', options: [] };
    expect(planQuestionChanges([], [fresh])).toEqual([{ kind: 'create', order: 1, question: fresh }]);
  });
});

describe('validateQuestions', () => {
  const valid: DraftQuestion = {
    id: null,
    text: '¿Qué es obligatorio?',
    explanation: '',
    options: [
      { text: 'Cifrar el disco', isCorrect: true },
      { text: 'Nada', isCorrect: false },
    ],
  };

  it('acepta una pregunta completa', () => {
    expect(validateQuestions([valid])).toEqual(['']);
  });

  it('exige el enunciado', () => {
    expect(validateQuestions([{ ...valid, text: '  ' }])[0]).toMatch(/enunciado/);
  });

  it('exige todas las opciones completas y al menos dos', () => {
    expect(validateQuestions([{ ...valid, options: [{ text: 'Una', isCorrect: true }] }])[0]).toMatch(/opciones/);
    expect(validateQuestions([{ ...valid, options: [...valid.options, { text: '', isCorrect: false }] }])[0]).toMatch(/opciones/);
  });

  it('exige exactamente una opción correcta', () => {
    const twoCorrect = { ...valid, options: valid.options.map((o) => ({ ...o, isCorrect: true })) };
    expect(validateQuestions([twoCorrect])[0]).toMatch(/exactamente una/);
  });
});
