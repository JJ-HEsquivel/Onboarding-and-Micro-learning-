/**
 * "Mis documentos" del colaborador: los documentos de su inducción más reciente,
 * visibles solo cuando su Manager ya validó la ruta.
 */
import { Jsi_onboardingsService } from '@/generated/services/Jsi_onboardingsService';
import { Jsi_documentassignmentsService } from '@/generated/services/Jsi_documentassignmentsService';
import { Jsi_evidencesService } from '@/generated/services/Jsi_evidencesService';
import { ASSIGNMENT_STATUS, PROGRESS_STATUS, VALIDATION_STATUS } from '@/shared/constants/choices';
import type { RouteDocument } from '@/shared/types/onboarding';
import { ACTIVE_RECORDS, bind, fetchAll, unwrap } from './dataverse';
import { loadOnboardingCatalog } from './onboardingRoute.service';
import { getPeopleById } from './people.service';

type AssignmentChanges = Parameters<typeof Jsi_documentassignmentsService.update>[1];
type OnboardingChanges = Parameters<typeof Jsi_onboardingsService.update>[1];
type NewEvidenceRecord = Parameters<typeof Jsi_evidencesService.create>[0];

export interface MyDocument extends RouteDocument {
  assignmentId: string;
  isRead: boolean;
  /** "AAAA-MM-DD" */
  dueDate: string | null;
  confirmedOn: string | null;
}

export interface MyStage {
  id: string;
  name: string;
  order: number;
  documents: MyDocument[];
}

export type MyDocumentsResult =
  | { state: 'noOnboarding' }
  | { state: 'pendingValidation'; validatorName: string | null }
  | { state: 'active'; onboardingId: string; hasStarted: boolean; stages: MyStage[] };

export async function loadMyDocuments(personId: string): Promise<MyDocumentsResult> {
  const onboardings = unwrap(
    await Jsi_onboardingsService.getAll({
      select: ['jsi_onboardingid', 'jsi_validationstatus', 'jsi_progressstatus', '_jsi_validator_value'],
      filter: `${ACTIVE_RECORDS} and _jsi_employee_value eq ${personId}`,
      orderBy: ['createdon desc'],
      top: 1,
    }),
    'Leer su inducción',
  );
  const onboarding = onboardings[0];
  if (!onboarding) return { state: 'noOnboarding' };

  if (onboarding.jsi_validationstatus === VALIDATION_STATUS.PendingValidation) {
    const validatorId = onboarding._jsi_validator_value;
    const people = validatorId ? await getPeopleById() : null;
    return { state: 'pendingValidation', validatorName: (validatorId && people?.get(validatorId)?.fullname) || null };
  }

  const [assignments, catalog] = await Promise.all([
    fetchAll(
      (o) => Jsi_documentassignmentsService.getAll(o),
      {
        select: [
          'jsi_documentassignmentid',
          '_jsi_document_value',
          '_jsi_stage_value',
          'jsi_status',
          'jsi_duedate',
          'jsi_confirmedon',
        ],
        filter: `${ACTIVE_RECORDS} and _jsi_onboarding_value eq ${onboarding.jsi_onboardingid}`,
      },
      'Leer sus documentos',
    ),
    loadOnboardingCatalog(),
  ]);

  const documents = new Map(catalog.documents.map((item) => [item.document.id, item]));
  const stagesById = new Map(catalog.stages.map((stage) => [stage.id, stage]));
  const stages = new Map<string, MyStage>();

  for (const assignment of assignments) {
    const item = assignment._jsi_document_value ? documents.get(assignment._jsi_document_value) : undefined;
    if (!item) continue;
    const stageId = assignment._jsi_stage_value ?? item.stageId;
    const stage = stagesById.get(stageId);

    if (!stages.has(stageId)) {
      stages.set(stageId, { id: stageId, name: stage?.name ?? 'Sin etapa', order: stage?.order ?? 99, documents: [] });
    }
    stages.get(stageId)!.documents.push({
      ...item.document,
      assignmentId: assignment.jsi_documentassignmentid,
      isRead: assignment.jsi_status === ASSIGNMENT_STATUS.Read,
      dueDate: assignment.jsi_duedate?.slice(0, 10) ?? null,
      confirmedOn: assignment.jsi_confirmedon ?? null,
    });
  }

  const sortedStages = [...stages.values()]
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
    .map((stage) => ({ ...stage, documents: stage.documents.sort((a, b) => a.code.localeCompare(b.code)) }));

  return {
    state: 'active',
    onboardingId: onboarding.jsi_onboardingid,
    hasStarted: onboarding.jsi_progressstatus !== PROGRESS_STATUS.NotStarted,
    stages: sortedStages,
  };
}

/**
 * El colaborador confirma que leyó un documento:
 * - La asignación pasa a "Read" con la fecha de confirmación.
 * - Se guarda una evidencia (jsi_evidence) para auditoría.
 * - Si era su primera lectura, la inducción pasa a "En curso".
 */
export async function confirmReading(
  personId: string,
  onboardingId: string,
  hasStarted: boolean,
  document: MyDocument,
): Promise<void> {
  const now = new Date().toISOString();

  const assignmentChanges: AssignmentChanges = { jsi_status: ASSIGNMENT_STATUS.Read, jsi_confirmedon: now };
  unwrap(await Jsi_documentassignmentsService.update(document.assignmentId, assignmentChanges), 'Confirmar lectura');

  const evidence = {
    'jsi_Employee@odata.bind': bind('contacts', personId),
    'jsi_Document@odata.bind': bind('jsi_documents', document.id),
    jsi_version: document.version,
    jsi_date: now,
  } as NewEvidenceRecord;
  unwrap(await Jsi_evidencesService.create(evidence), 'Registrar evidencia de lectura');

  if (!hasStarted) {
    const onboardingChanges: OnboardingChanges = { jsi_progressstatus: PROGRESS_STATUS.InProgress };
    unwrap(await Jsi_onboardingsService.update(onboardingId, onboardingChanges), 'Actualizar avance');
  }
}
