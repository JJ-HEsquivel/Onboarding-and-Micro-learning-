/**
 * "Mi inducción" del colaborador: su ruta, el avance y la confirmación de lectura.
 * La ruta solo es visible cuando su Manager ya la validó.
 */
import { Jsi_onboardingsService } from '@/generated/services/Jsi_onboardingsService';
import { Jsi_documentassignmentsService } from '@/generated/services/Jsi_documentassignmentsService';
import { Jsi_assessmentassignmentsService } from '@/generated/services/Jsi_assessmentassignmentsService';
import { ASSIGNMENT_STATUS, EXAM_STATUS, VALIDATION_STATUS } from '@/shared/constants/choices';
import { PROGRAM_RULES } from '@/shared/constants/program';
import { documentStep, type DocumentStep } from '@/shared/domain/onboardingProgress';
import { addCalendarDays, todayIso } from '@/shared/lib/dates';
import type { ProgressSummary, RouteDocument } from '@/shared/types/onboarding';
import { listAreas } from './areas.service';
import { ACTIVE_RECORDS, unwrap } from './dataverse';
import { recordEvidence } from './evidence.service';
import { loadOnboardingCatalog } from './onboardingRoute.service';
import { getPeopleById } from './people.service';
import { loadRouteEntries, progressOf, saveOnboardingProgress, type RouteEntry } from './route.service';

type AssignmentChanges = Parameters<typeof Jsi_documentassignmentsService.update>[1];
type ExamChanges = Parameters<typeof Jsi_assessmentassignmentsService.update>[1];

/** Un documento de la ruta del colaborador: datos del documento + su estado. */
export interface MyDocument extends RouteDocument, Omit<RouteEntry, 'documentId' | 'assessmentId'> {
  stageName: string;
  step: DocumentStep;
}

export interface MyStage {
  id: string;
  name: string;
  order: number;
  documents: MyDocument[];
}

interface InductionInfo {
  onboardingId: string;
  validatorName: string | null;
  areaName: string;
  startDate: string | null;
}

export type MyInduction =
  | { state: 'noOnboarding' }
  | (InductionInfo & { state: 'pendingValidation'; proposed: RouteDocument[] })
  | (InductionInfo & {
      state: 'active';
      validatedOn: string | null;
      completedOn: string | null;
      stages: MyStage[];
      progress: ProgressSummary;
    });

export async function loadMyInduction(personId: string): Promise<MyInduction> {
  const onboardings = unwrap(
    await Jsi_onboardingsService.getAll({
      select: [
        'jsi_onboardingid',
        'jsi_validationstatus',
        '_jsi_validator_value',
        '_jsi_area_value',
        'jsi_startdate',
        'jsi_validatedon',
        'jsi_completedon',
      ],
      filter: `${ACTIVE_RECORDS} and _jsi_employee_value eq ${personId}`,
      orderBy: ['createdon desc'],
      top: 1,
    }),
    'Leer su inducción',
  );
  const onboarding = onboardings[0];
  if (!onboarding) return { state: 'noOnboarding' };

  const [people, areas, catalog, routes] = await Promise.all([
    getPeopleById(),
    listAreas(),
    loadOnboardingCatalog(),
    loadRouteEntries([onboarding.jsi_onboardingid]),
  ]);

  const validatorId = onboarding._jsi_validator_value;
  const info: InductionInfo = {
    onboardingId: onboarding.jsi_onboardingid,
    validatorName: (validatorId && people.get(validatorId)?.fullname) || null,
    areaName: areas.find((a) => a.id === onboarding._jsi_area_value)?.name ?? '—',
    startDate: onboarding.jsi_startdate ?? null,
  };

  const documents = new Map(catalog.documents.map((item) => [item.document.id, item]));
  const stagesById = new Map(catalog.stages.map((stage) => [stage.id, stage]));
  const entries = routes.get(onboarding.jsi_onboardingid) ?? [];

  if (onboarding.jsi_validationstatus === VALIDATION_STATUS.PendingValidation) {
    const proposed = entries.flatMap((entry) => {
      const item = documents.get(entry.documentId);
      return item ? [item.document] : [];
    });
    return { ...info, state: 'pendingValidation', proposed };
  }

  const stages = new Map<string, MyStage>();
  for (const entry of entries) {
    const item = documents.get(entry.documentId);
    if (!item) continue;
    const stageId = entry.stageId ?? item.stageId;
    const stage = stagesById.get(stageId);
    if (!stages.has(stageId)) {
      stages.set(stageId, { id: stageId, name: stage?.name ?? 'Documentación adicional', order: stage?.order ?? 99, documents: [] });
    }
    stages.get(stageId)!.documents.push({
      ...item.document,
      ...entry,
      assessmentId: entry.assessmentId ?? item.document.assessmentId,
      stageName: stage?.name ?? 'Documentación adicional',
      step: documentStep(entry, PROGRAM_RULES.maxAttempts),
    });
  }

  return {
    ...info,
    state: 'active',
    validatedOn: onboarding.jsi_validatedon ?? null,
    completedOn: onboarding.jsi_completedon ?? null,
    stages: [...stages.values()]
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
      .map((stage) => ({ ...stage, documents: stage.documents.sort((a, b) => a.code.localeCompare(b.code)) })),
    progress: progressOf(entries),
  };
}

/**
 * El colaborador confirma que leyó un documento:
 * - La asignación pasa a "Read" con la fecha de confirmación.
 * - Se habilita el examen del documento, con su propio plazo.
 * - Se guarda una evidencia (jsi_evidence) para auditoría.
 * - Se recalcula el avance de la inducción.
 */
export async function confirmReading(personId: string, onboardingId: string, document: MyDocument): Promise<void> {
  const assignmentChanges: AssignmentChanges = { jsi_status: ASSIGNMENT_STATUS.Read, jsi_confirmedon: new Date().toISOString() };
  unwrap(await Jsi_documentassignmentsService.update(document.assignmentId, assignmentChanges), 'Confirmar lectura');

  if (document.examAssignmentId && document.exam?.status === 'locked') {
    const examChanges: ExamChanges = {
      jsi_status: EXAM_STATUS.Pending,
      jsi_duedate: addCalendarDays(todayIso(), PROGRAM_RULES.examDueDays),
    };
    unwrap(await Jsi_assessmentassignmentsService.update(document.examAssignmentId, examChanges), 'Habilitar examen');
  }

  await recordEvidence({
    personId,
    type: 'ReadingConfirmation',
    documentId: document.id,
    version: document.version,
    result: 'Confirmada',
    description: `Lectura de ${document.title} v${document.version}`,
  });

  await saveOnboardingProgress(onboardingId);
}
