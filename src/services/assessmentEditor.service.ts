/**
 * Gestión de las evaluaciones de los documentos por parte del Administrador:
 * configuración (jsi_assessment), preguntas (jsi_question) y opciones (jsi_answeroption).
 *
 * Cada documento tiene UNA evaluación de tipo "Document". Las reglas para editar preguntas
 * ya respondidas están en shared/domain/assessmentChanges.ts.
 */
import { Jsi_assessmentsService } from '@/generated/services/Jsi_assessmentsService';
import { Jsi_questionsService } from '@/generated/services/Jsi_questionsService';
import { Jsi_answeroptionsService } from '@/generated/services/Jsi_answeroptionsService';
import { Jsi_questionresponsesService } from '@/generated/services/Jsi_questionresponsesService';
import { Jsi_assessmentassignmentsService } from '@/generated/services/Jsi_assessmentassignmentsService';
import { Jsi_assessmentattemptsService } from '@/generated/services/Jsi_assessmentattemptsService';
import { ASSESSMENT_TYPE } from '@/shared/constants/choices';
import { PROGRAM_RULES } from '@/shared/constants/program';
import { planQuestionChanges, type DraftQuestion, type QuestionChange, type SavedQuestion } from '@/shared/domain/assessmentChanges';
import { todayIso } from '@/shared/lib/dates';
import type { AssessmentSettings } from '@/shared/types/content';
import { ACTIVE_RECORDS, anyOf, bind, fetchAll, unwrap } from './dataverse';

type NewAssessmentRecord = Parameters<typeof Jsi_assessmentsService.create>[0];
type AssessmentChanges = Parameters<typeof Jsi_assessmentsService.update>[1];
type NewQuestionRecord = Parameters<typeof Jsi_questionsService.create>[0];
type QuestionChanges = Parameters<typeof Jsi_questionsService.update>[1];
type NewOptionRecord = Parameters<typeof Jsi_answeroptionsService.create>[0];

/** Configuración con la que nace una evaluación nueva (las reglas del programa). */
export const DEFAULT_SETTINGS: AssessmentSettings = {
  passingScore: PROGRAM_RULES.passingScore,
  maxAttempts: PROGRAM_RULES.maxAttempts,
  durationMinutes: 8,
};

export interface AssessmentStats {
  assessmentId: string;
  settings: AssessmentSettings;
  /** Intentos rendidos por todas las personas. */
  attempts: number;
  /** Intentos aprobados. */
  passed: number;
  /** % de intentos aprobados, o null si nadie la rindió. */
  passRate: number | null;
}

/** Configuración y resultados de todas las evaluaciones de documentos (clave: documentId). */
export async function loadAssessmentStats(): Promise<Map<string, AssessmentStats>> {
  const [assessments, assignments, attempts] = await Promise.all([
    fetchAll(
      (o) => Jsi_assessmentsService.getAll(o),
      {
        select: ['jsi_assessmentid', '_jsi_document_value', 'jsi_passingscore', 'jsi_maxattempts', 'jsi_durationminutes'],
        filter: `${ACTIVE_RECORDS} and jsi_type eq ${ASSESSMENT_TYPE.Document}`,
      },
      'Leer evaluaciones',
    ),
    fetchAll(
      (o) => Jsi_assessmentassignmentsService.getAll(o),
      { select: ['jsi_assessmentassignmentid', '_jsi_assessment_value'], filter: ACTIVE_RECORDS },
      'Leer exámenes asignados',
    ),
    fetchAll(
      (o) => Jsi_assessmentattemptsService.getAll(o),
      { select: ['_jsi_assignment_value', 'jsi_passed'], filter: ACTIVE_RECORDS },
      'Leer intentos',
    ),
  ]);

  const assessmentByAssignment = new Map(assignments.map((a) => [a.jsi_assessmentassignmentid, a._jsi_assessment_value]));
  const totals = new Map<string, { attempts: number; passed: number }>();
  for (const attempt of attempts) {
    const assessmentId = attempt._jsi_assignment_value ? assessmentByAssignment.get(attempt._jsi_assignment_value) : undefined;
    if (!assessmentId) continue;
    const total = totals.get(assessmentId) ?? { attempts: 0, passed: 0 };
    total.attempts++;
    if (attempt.jsi_passed) total.passed++;
    totals.set(assessmentId, total);
  }

  const stats = new Map<string, AssessmentStats>();
  for (const a of assessments) {
    if (!a._jsi_document_value) continue;
    const total = totals.get(a.jsi_assessmentid);
    stats.set(a._jsi_document_value, {
      assessmentId: a.jsi_assessmentid,
      settings: {
        passingScore: a.jsi_passingscore,
        maxAttempts: a.jsi_maxattempts,
        durationMinutes: a.jsi_durationminutes ?? DEFAULT_SETTINGS.durationMinutes,
      },
      attempts: total?.attempts ?? 0,
      passed: total?.passed ?? 0,
      passRate: total ? Math.round((total.passed / total.attempts) * 100) : null,
    });
  }
  return stats;
}

/** Preguntas activas de una evaluación con sus opciones y si alguien ya las respondió. */
export async function loadQuestions(assessmentId: string): Promise<SavedQuestion[]> {
  const questions = await fetchAll(
    (o) => Jsi_questionsService.getAll(o),
    {
      select: ['jsi_questionid', 'jsi_text', 'jsi_explanation', 'jsi_order'],
      filter: `${ACTIVE_RECORDS} and jsi_active eq true and _jsi_assessment_value eq ${assessmentId}`,
      orderBy: ['jsi_order asc'],
    },
    'Leer preguntas',
  );
  if (questions.length === 0) return [];

  const questionFilter = anyOf('_jsi_question_value', questions.map((q) => q.jsi_questionid));
  const [options, responses] = await Promise.all([
    fetchAll(
      (o) => Jsi_answeroptionsService.getAll(o),
      {
        select: ['jsi_answeroptionid', 'jsi_text', 'jsi_iscorrect', '_jsi_question_value'],
        filter: `${ACTIVE_RECORDS} and ${questionFilter}`,
        orderBy: ['jsi_order asc'],
      },
      'Leer opciones',
    ),
    fetchAll(
      (o) => Jsi_questionresponsesService.getAll(o),
      { select: ['_jsi_question_value'], filter: questionFilter },
      'Leer respuestas',
    ),
  ]);
  const answered = new Set(responses.map((r) => r._jsi_question_value));

  return questions.map((q, i) => ({
    id: q.jsi_questionid,
    text: q.jsi_text ?? '',
    explanation: q.jsi_explanation ?? '',
    order: q.jsi_order ?? i + 1,
    options: options
      .filter((o) => o._jsi_question_value === q.jsi_questionid)
      .map((o) => ({ id: o.jsi_answeroptionid, text: o.jsi_text ?? '', isCorrect: o.jsi_iscorrect ?? false })),
    answered: answered.has(q.jsi_questionid),
  }));
}

async function createOptions(questionId: string, question: DraftQuestion): Promise<void> {
  // En orden, para que jsi_order coincida con lo que se ve en el editor.
  for (const [index, option] of question.options.entries()) {
    const record = {
      'jsi_Question@odata.bind': bind('jsi_questions', questionId),
      jsi_text: option.text.trim(),
      jsi_order: index + 1,
      jsi_iscorrect: option.isCorrect,
    } as NewOptionRecord;
    unwrap(await Jsi_answeroptionsService.create(record), 'Crear opción');
  }
}

async function createQuestion(assessmentId: string, order: number, question: DraftQuestion): Promise<void> {
  const record = {
    'jsi_Assessment@odata.bind': bind('jsi_assessments', assessmentId),
    jsi_text: question.text.trim(),
    jsi_explanation: question.explanation.trim(),
    jsi_order: order,
    jsi_active: true,
  } as NewQuestionRecord;
  const questionId = unwrap(await Jsi_questionsService.create(record), 'Crear pregunta').jsi_questionid;
  await createOptions(questionId, question);
}

const updateQuestion = async (id: string, changes: QuestionChanges) =>
  unwrap(await Jsi_questionsService.update(id, changes), 'Actualizar pregunta');

const deleteOptions = (ids: string[]) => Promise.all(ids.map((id) => Jsi_answeroptionsService.delete(id)));

async function applyChange(assessmentId: string, change: QuestionChange): Promise<void> {
  switch (change.kind) {
    case 'create':
      return createQuestion(assessmentId, change.order, change.question);
    case 'update':
      await updateQuestion(change.id, {
        jsi_text: change.question.text.trim(),
        jsi_explanation: change.question.explanation.trim(),
        jsi_order: change.order,
      });
      await deleteOptions(change.optionIdsToDelete);
      return createOptions(change.id, change.question);
    case 'reorder':
      await updateQuestion(change.id, { jsi_order: change.order });
      return;
    case 'replace':
      await updateQuestion(change.id, { jsi_active: false });
      return createQuestion(assessmentId, change.order, change.question);
    case 'archive':
      await updateQuestion(change.id, { jsi_active: false });
      return;
    case 'delete':
      await deleteOptions(change.optionIdsToDelete);
      await Jsi_questionsService.delete(change.id);
      return;
  }
}

export interface SaveAssessmentInput {
  document: { id: string; title: string; stageId: string | null };
  /** null si el documento todavía no tiene evaluación (se crea). */
  assessmentId: string | null;
  settings: AssessmentSettings;
  /** Preguntas tal como estaban al abrir el editor. */
  saved: SavedQuestion[];
  /** Preguntas tal como quedaron en el editor. */
  drafts: DraftQuestion[];
}

/** Guarda la configuración y las preguntas. Devuelve el id de la evaluación. */
export async function saveAssessment(input: SaveAssessmentInput): Promise<string> {
  const fields = {
    jsi_title: `Evaluación · ${input.document.title}`,
    jsi_passingscore: input.settings.passingScore,
    jsi_maxattempts: input.settings.maxAttempts,
    jsi_durationminutes: input.settings.durationMinutes,
  };

  let assessmentId: string;
  if (input.assessmentId) {
    unwrap(await Jsi_assessmentsService.update(input.assessmentId, fields as AssessmentChanges), 'Actualizar evaluación');
    assessmentId = input.assessmentId;
  } else {
    const record = {
      ...fields,
      'jsi_Document@odata.bind': bind('jsi_documents', input.document.id),
      ...(input.document.stageId ? { 'jsi_Stage@odata.bind': bind('jsi_stages', input.document.stageId) } : {}),
      jsi_type: ASSESSMENT_TYPE.Document,
      jsi_generatedby: 'Editor de evaluaciones',
      jsi_date: todayIso(),
    } as NewAssessmentRecord;
    assessmentId = unwrap(await Jsi_assessmentsService.create(record), 'Crear evaluación').jsi_assessmentid;
  }

  // Uno por uno: así, si algo falla, se sabe exactamente hasta dónde se guardó.
  for (const change of planQuestionChanges(input.saved, input.drafts)) {
    await applyChange(assessmentId, change);
  }
  return assessmentId;
}
