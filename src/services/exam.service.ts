/**
 * Examen de un documento: preguntas (jsi_question + jsi_answeroption), intentos
 * (jsi_assessmentattempt) y respuestas (jsi_questionresponse).
 *
 * Nota: las respuestas correctas se envían al navegador para corregir y mostrar la
 * revisión. Para un examen con valor legal, la corrección debería hacerse en el servidor
 * (por ejemplo, con un flujo de Power Automate o un plug-in de Dataverse).
 */
import { Jsi_assessmentsService } from '@/generated/services/Jsi_assessmentsService';
import { Jsi_questionsService } from '@/generated/services/Jsi_questionsService';
import { Jsi_answeroptionsService } from '@/generated/services/Jsi_answeroptionsService';
import { Jsi_assessmentassignmentsService } from '@/generated/services/Jsi_assessmentassignmentsService';
import { Jsi_assessmentattemptsService } from '@/generated/services/Jsi_assessmentattemptsService';
import { Jsi_questionresponsesService } from '@/generated/services/Jsi_questionresponsesService';
import { EXAM_STATUS } from '@/shared/constants/choices';
import { PROGRAM_RULES } from '@/shared/constants/program';
import { ACTIVE_RECORDS, bind, fetchAll, unwrap } from './dataverse';
import { recordEvidence } from './evidence.service';
import { saveOnboardingProgress } from './route.service';

type NewAttemptRecord = Parameters<typeof Jsi_assessmentattemptsService.create>[0];
type NewResponseRecord = Parameters<typeof Jsi_questionresponsesService.create>[0];
type ExamChanges = Parameters<typeof Jsi_assessmentassignmentsService.update>[1];

export interface ExamOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface ExamQuestion {
  id: string;
  text: string;
  explanation: string;
  options: ExamOption[];
}

export interface Exam {
  assessmentId: string;
  title: string;
  durationMinutes: number;
  passingScore: number;
  maxAttempts: number;
  questions: ExamQuestion[];
}

export async function loadExam(assessmentId: string): Promise<Exam> {
  const [assessment, questions] = await Promise.all([
    Jsi_assessmentsService.get(assessmentId, {
      select: ['jsi_assessmentid', 'jsi_title', 'jsi_durationminutes', 'jsi_passingscore', 'jsi_maxattempts'],
    }).then((result) => unwrap(result, 'Leer evaluación')),
    fetchAll(
      (o) => Jsi_questionsService.getAll(o),
      {
        select: ['jsi_questionid', 'jsi_text', 'jsi_explanation', 'jsi_order'],
        filter: `${ACTIVE_RECORDS} and jsi_active eq true and _jsi_assessment_value eq ${assessmentId}`,
        orderBy: ['jsi_order asc'],
      },
      'Leer preguntas',
    ),
  ]);

  const options =
    questions.length === 0
      ? []
      : await fetchAll(
          (o) => Jsi_answeroptionsService.getAll(o),
          {
            select: ['jsi_answeroptionid', 'jsi_text', 'jsi_iscorrect', 'jsi_order', '_jsi_question_value'],
            filter: `${ACTIVE_RECORDS} and (${questions.map((q) => `_jsi_question_value eq ${q.jsi_questionid}`).join(' or ')})`,
            orderBy: ['jsi_order asc'],
          },
          'Leer opciones de respuesta',
        );

  return {
    assessmentId,
    title: (assessment.jsi_title ?? '').replace(/^Evaluación · /, ''),
    durationMinutes: assessment.jsi_durationminutes ?? 8,
    passingScore: assessment.jsi_passingscore ?? PROGRAM_RULES.passingScore,
    maxAttempts: assessment.jsi_maxattempts ?? PROGRAM_RULES.maxAttempts,
    questions: questions.map((q) => ({
      id: q.jsi_questionid,
      text: q.jsi_text ?? '',
      explanation: q.jsi_explanation ?? '',
      options: options
        .filter((o) => o._jsi_question_value === q.jsi_questionid)
        .map((o) => ({ id: o.jsi_answeroptionid, text: o.jsi_text ?? '', isCorrect: o.jsi_iscorrect ?? false })),
    })),
  };
}

export interface ExamSubmission {
  personId: string;
  onboardingId: string;
  examAssignmentId: string;
  /** Intentos usados ANTES de este. */
  attemptsUsed: number;
  exam: Exam;
  /** Opción elegida en cada pregunta (mismo orden que exam.questions); null si no respondió. */
  answers: (string | null)[];
  durationSeconds: number;
  documentId: string;
  documentVersion: string;
}

export interface ExamResult {
  score: number;
  correct: number;
  total: number;
  passed: boolean;
  attemptNumber: number;
  attemptsLeft: number;
}

/** Corrige el examen (función pura). */
export function gradeExam(exam: Exam, answers: (string | null)[]): Pick<ExamResult, 'score' | 'correct' | 'total' | 'passed'> {
  const total = exam.questions.length;
  const correct = exam.questions.filter((q, i) => q.options.some((o) => o.id === answers[i] && o.isCorrect)).length;
  const score = total ? Math.round((correct / total) * 100) : 0;
  return { score, correct, total, passed: score >= exam.passingScore };
}

/**
 * Registra un intento: el intento con sus respuestas, el nuevo estado del examen,
 * la evidencia y el avance actualizado de la inducción.
 */
export async function submitExam(submission: ExamSubmission): Promise<ExamResult> {
  const { exam, answers } = submission;
  const grade = gradeExam(exam, answers);
  const attemptNumber = submission.attemptsUsed + 1;
  const now = new Date().toISOString();

  const attempt = unwrap(
    await Jsi_assessmentattemptsService.create({
      'jsi_Assignment@odata.bind': bind('jsi_assessmentassignments', submission.examAssignmentId),
      jsi_attemptnumber: attemptNumber,
      jsi_score: grade.score,
      jsi_correctcount: grade.correct,
      jsi_questioncount: grade.total,
      jsi_passed: grade.passed,
      jsi_takenon: now,
      jsi_durationseconds: submission.durationSeconds,
    } as NewAttemptRecord),
    'Registrar intento',
  );

  await Promise.all(
    exam.questions.map(async (question, i) => {
      const selected = question.options.find((o) => o.id === answers[i]);
      const record = {
        'jsi_Attempt@odata.bind': bind('jsi_assessmentattempts', attempt.jsi_assessmentattemptid),
        'jsi_Question@odata.bind': bind('jsi_questions', question.id),
        ...(selected ? { 'jsi_SelectedOption@odata.bind': bind('jsi_answeroptions', selected.id) } : {}),
        jsi_iscorrect: selected?.isCorrect ?? false,
      } as NewResponseRecord;
      unwrap(await Jsi_questionresponsesService.create(record), 'Registrar respuesta');
    }),
  );

  const changes: ExamChanges = {
    jsi_status: grade.passed ? EXAM_STATUS.Passed : EXAM_STATUS.Failed,
    jsi_score: grade.score,
    jsi_attemptsused: attemptNumber,
    ...(grade.passed ? { jsi_resolvedon: now } : {}),
  };
  unwrap(await Jsi_assessmentassignmentsService.update(submission.examAssignmentId, changes), 'Actualizar examen');

  await recordEvidence({
    personId: submission.personId,
    type: grade.passed ? 'AssessmentPassed' : 'AssessmentFailed',
    documentId: submission.documentId,
    assessmentId: exam.assessmentId,
    version: submission.documentVersion,
    result: `${grade.score}%`,
    description: `Examen de ${exam.title} · intento ${attemptNumber} de ${exam.maxAttempts}`,
  });

  await saveOnboardingProgress(submission.onboardingId);

  return { ...grade, attemptNumber, attemptsLeft: Math.max(0, exam.maxAttempts - attemptNumber) };
}
