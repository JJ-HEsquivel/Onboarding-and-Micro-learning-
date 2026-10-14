/**
 * Ruta REAL de cada inducción: los documentos asignados (jsi_documentassignment) y el
 * examen de cada uno (jsi_assessmentassignment), más el cálculo y guardado de su avance.
 */
import { Jsi_documentassignmentsService } from '@/generated/services/Jsi_documentassignmentsService';
import { Jsi_assessmentassignmentsService } from '@/generated/services/Jsi_assessmentassignmentsService';
import { Jsi_assessmentsService } from '@/generated/services/Jsi_assessmentsService';
import { Jsi_onboardingsService } from '@/generated/services/Jsi_onboardingsService';
import { ASSIGNMENT_STATUS, EXAM_STATUS, PROGRESS_STATUS, RISK_LEVEL } from '@/shared/constants/choices';
import { PROGRAM_RULES } from '@/shared/constants/program';
import { computeProgress, type ExamState, type ExamStatus, type RouteItemState } from '@/shared/domain/onboardingProgress';
import { todayIso } from '@/shared/lib/dates';
import type { ProgressSummary } from '@/shared/types/onboarding';
import { ACTIVE_RECORDS, fetchAll, unwrap } from './dataverse';

type OnboardingChanges = Parameters<typeof Jsi_onboardingsService.update>[1];

/** Un documento de la ruta de una persona, con su examen. */
export interface RouteEntry extends RouteItemState {
  assignmentId: string;
  documentId: string;
  stageId: string | null;
  confirmedOn: string | null;
  /** Asignación del examen (jsi_assessmentassignment), o null si el documento no tiene examen. */
  examAssignmentId: string | null;
  assessmentId: string | null;
  exam: ExamState | null;
}

const EXAM_STATUS_BY_VALUE = new Map<number, ExamStatus>([
  [EXAM_STATUS.Locked, 'locked'],
  [EXAM_STATUS.Pending, 'pending'],
  [EXAM_STATUS.Passed, 'passed'],
  [EXAM_STATUS.Failed, 'failed'],
]);

const PROGRESS_VALUE: Record<ProgressSummary['status'], number> = {
  notStarted: PROGRESS_STATUS.NotStarted,
  inProgress: PROGRESS_STATUS.InProgress,
  overdue: PROGRESS_STATUS.Overdue,
  completed: PROGRESS_STATUS.Completed,
};

const RISK_VALUE: Record<ProgressSummary['risk'], number> = {
  low: RISK_LEVEL.Low,
  medium: RISK_LEVEL.Medium,
  high: RISK_LEVEL.High,
};

const byOnboarding = (ids: string[] | undefined) =>
  ids === undefined ? ACTIVE_RECORDS : `${ACTIVE_RECORDS} and (${ids.map((id) => `_jsi_onboarding_value eq ${id}`).join(' or ')})`;

/**
 * Lee la ruta de las inducciones indicadas (o de todas si no se indica ninguna).
 * @returns jsi_onboardingid → documentos de su ruta
 */
export async function loadRouteEntries(onboardingIds?: string[]): Promise<Map<string, RouteEntry[]>> {
  const routes = new Map<string, RouteEntry[]>();
  if (onboardingIds?.length === 0) return routes;

  const [documentAssignments, examAssignments, assessments] = await Promise.all([
    fetchAll(
      (o) => Jsi_documentassignmentsService.getAll(o),
      {
        select: [
          'jsi_documentassignmentid',
          '_jsi_onboarding_value',
          '_jsi_document_value',
          '_jsi_stage_value',
          'jsi_status',
          'jsi_duedate',
          'jsi_confirmedon',
        ],
        filter: byOnboarding(onboardingIds),
      },
      'Leer documentos asignados',
    ),
    fetchAll(
      (o) => Jsi_assessmentassignmentsService.getAll(o),
      {
        select: [
          'jsi_assessmentassignmentid',
          '_jsi_onboarding_value',
          '_jsi_assessment_value',
          'jsi_status',
          'jsi_score',
          'jsi_attemptsused',
          'jsi_duedate',
        ],
        filter: byOnboarding(onboardingIds),
      },
      'Leer exámenes asignados',
    ),
    fetchAll(
      (o) => Jsi_assessmentsService.getAll(o),
      { select: ['jsi_assessmentid', '_jsi_document_value'], filter: ACTIVE_RECORDS },
      'Leer evaluaciones',
    ),
  ]);

  const documentByAssessment = new Map(assessments.map((a) => [a.jsi_assessmentid, a._jsi_document_value]));
  // Clave "inducción|documento" → asignación del examen
  const examByDocument = new Map(
    examAssignments.flatMap((exam) => {
      const documentId = exam._jsi_assessment_value ? documentByAssessment.get(exam._jsi_assessment_value) : undefined;
      return exam._jsi_onboarding_value && documentId ? [[`${exam._jsi_onboarding_value}|${documentId}`, exam] as const] : [];
    }),
  );

  for (const assignment of documentAssignments) {
    const onboardingId = assignment._jsi_onboarding_value;
    const documentId = assignment._jsi_document_value;
    if (!onboardingId || !documentId) continue;

    const exam = examByDocument.get(`${onboardingId}|${documentId}`);
    const entry: RouteEntry = {
      assignmentId: assignment.jsi_documentassignmentid,
      documentId,
      stageId: assignment._jsi_stage_value ?? null,
      isRead: assignment.jsi_status === ASSIGNMENT_STATUS.Read,
      dueDate: assignment.jsi_duedate?.slice(0, 10) ?? null,
      confirmedOn: assignment.jsi_confirmedon ?? null,
      examAssignmentId: exam?.jsi_assessmentassignmentid ?? null,
      assessmentId: exam?._jsi_assessment_value ?? null,
      exam: exam
        ? {
            status: EXAM_STATUS_BY_VALUE.get(exam.jsi_status) ?? 'locked',
            score: exam.jsi_score ?? null,
            attemptsUsed: exam.jsi_attemptsused ?? 0,
            dueDate: exam.jsi_duedate?.slice(0, 10) ?? null,
          }
        : null,
    };
    if (!routes.has(onboardingId)) routes.set(onboardingId, []);
    routes.get(onboardingId)!.push(entry);
  }
  return routes;
}

/** Avance de una ruta a la fecha de hoy. */
export function progressOf(entries: RouteEntry[]): ProgressSummary {
  return computeProgress(entries, todayIso(), PROGRAM_RULES.maxAttempts);
}

/**
 * Recalcula el avance de una inducción y lo guarda en jsi_onboarding (estado, riesgo y
 * fecha de cierre), para que Power BI y Power Automate vean el mismo dato que la app.
 */
export async function saveOnboardingProgress(onboardingId: string): Promise<ProgressSummary> {
  const entries = (await loadRouteEntries([onboardingId])).get(onboardingId) ?? [];
  const progress = progressOf(entries);
  const changes: OnboardingChanges = {
    jsi_progressstatus: PROGRESS_VALUE[progress.status] as OnboardingChanges['jsi_progressstatus'],
    jsi_risklevel: RISK_VALUE[progress.risk] as OnboardingChanges['jsi_risklevel'],
    // Si vuelve a tener pendientes (ej. el Manager le sumó documentos), deja de estar cerrada.
    jsi_completedon: (progress.status === 'completed' ? todayIso() : null) as OnboardingChanges['jsi_completedon'],
  };
  unwrap(await Jsi_onboardingsService.update(onboardingId, changes), 'Guardar avance de la inducción');
  return progress;
}
