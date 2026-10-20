/**
 * Edición de las preguntas de una evaluación (funciones puras).
 *
 * Regla de auditoría: una pregunta que alguien ya respondió NUNCA se modifica ni se borra,
 * porque sus respuestas (jsi_questionresponse) deben seguir mostrando exactamente lo que se
 * preguntó. Si se edita, se ARCHIVA (jsi_active = false) y se crea una pregunta nueva.
 * Las preguntas sin respuestas sí se pueden editar o borrar directamente.
 */

export interface DraftOption {
  text: string;
  isCorrect: boolean;
}

/** Pregunta tal como está en el editor. */
export interface DraftQuestion {
  /** Pregunta guardada de la que proviene, o null si es nueva. */
  id: string | null;
  text: string;
  explanation: string;
  options: DraftOption[];
}

/** Pregunta tal como está guardada en Dataverse. */
export interface SavedQuestion {
  id: string;
  text: string;
  explanation: string;
  order: number;
  options: (DraftOption & { id: string })[];
  /** true si alguien ya la respondió en algún intento. */
  answered: boolean;
}

export type QuestionChange =
  /** Pregunta nueva. */
  | { kind: 'create'; order: number; question: DraftQuestion }
  /** Sin respuestas: se actualiza y se reemplazan sus opciones. */
  | { kind: 'update'; id: string; order: number; question: DraftQuestion; optionIdsToDelete: string[] }
  /** Solo cambió su posición. */
  | { kind: 'reorder'; id: string; order: number }
  /** Ya respondida y editada: se archiva la anterior y se crea una nueva. */
  | { kind: 'replace'; id: string; order: number; question: DraftQuestion }
  /** Ya respondida y quitada del editor: se archiva. */
  | { kind: 'archive'; id: string }
  /** Sin respuestas y quitada del editor: se borra (primero sus opciones). */
  | { kind: 'delete'; id: string; optionIdsToDelete: string[] };

export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 5;

const clean = (text: string) => text.trim();

function sameContent(saved: SavedQuestion, draft: DraftQuestion): boolean {
  return (
    clean(saved.text) === clean(draft.text) &&
    clean(saved.explanation) === clean(draft.explanation) &&
    saved.options.length === draft.options.length &&
    saved.options.every((o, i) => clean(o.text) === clean(draft.options[i].text) && o.isCorrect === draft.options[i].isCorrect)
  );
}

/** Lo que hay que hacer en Dataverse para que las preguntas guardadas queden como en el editor. */
export function planQuestionChanges(saved: SavedQuestion[], drafts: DraftQuestion[]): QuestionChange[] {
  const savedById = new Map(saved.map((q) => [q.id, q]));
  const changes: QuestionChange[] = [];

  drafts.forEach((draft, index) => {
    const order = index + 1;
    const original = draft.id ? savedById.get(draft.id) : undefined;
    if (!original) {
      changes.push({ kind: 'create', order, question: draft });
    } else if (sameContent(original, draft)) {
      if (original.order !== order) changes.push({ kind: 'reorder', id: original.id, order });
    } else if (original.answered) {
      changes.push({ kind: 'replace', id: original.id, order, question: draft });
    } else {
      changes.push({ kind: 'update', id: original.id, order, question: draft, optionIdsToDelete: original.options.map((o) => o.id) });
    }
  });

  const kept = new Set(drafts.map((d) => d.id));
  for (const question of saved) {
    if (kept.has(question.id)) continue;
    changes.push(
      question.answered
        ? { kind: 'archive', id: question.id }
        : { kind: 'delete', id: question.id, optionIdsToDelete: question.options.map((o) => o.id) },
    );
  }
  return changes;
}

/** Errores de cada pregunta (mismo orden que `drafts`); cadena vacía si está bien. */
export function validateQuestions(drafts: DraftQuestion[]): string[] {
  return drafts.map((draft) => {
    if (!clean(draft.text)) return 'Escriba el enunciado de la pregunta.';
    const filled = draft.options.filter((o) => clean(o.text));
    if (filled.length < MIN_OPTIONS || filled.length !== draft.options.length) {
      return `Complete todas las opciones (mínimo ${MIN_OPTIONS}).`;
    }
    const correct = draft.options.filter((o) => o.isCorrect).length;
    if (correct !== 1) return 'Marque exactamente una opción correcta.';
    return '';
  });
}
