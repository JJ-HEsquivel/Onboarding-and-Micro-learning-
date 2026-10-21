/**
 * Ficha de un colaborador (Admin y Manager): sus datos, su ruta por etapas, su historial
 * y las acciones sobre él (habilitar un nuevo intento, dar de baja).
 */
import { ContactsService } from '@/generated/services/ContactsService';
import { Jsi_onboardingsService } from '@/generated/services/Jsi_onboardingsService';
import { Jsi_assessmentassignmentsService } from '@/generated/services/Jsi_assessmentassignmentsService';
import { Jsi_roleassignmentsService } from '@/generated/services/Jsi_roleassignmentsService';
import { PROGRAM_RULES } from '@/shared/constants/program';
import { documentStep, isExamExhausted, type DocumentStep } from '@/shared/domain/onboardingProgress';
import { addCalendarDays, todayIso } from '@/shared/lib/dates';
import type { Collaborator, RouteDocument } from '@/shared/types/onboarding';
import { loadCollaboratorsOverview } from './collaborators.service';
import { ACTIVE_RECORDS, fetchAll, unwrap } from './dataverse';
import { listEvidence, type Evidence } from './evidence.service';
import { loadOnboardingCatalog } from './onboardingRoute.service';
import { getPeopleById } from './people.service';
import { loadRouteEntries, saveOnboardingProgress, type RouteEntry } from './route.service';

type ExamChanges = Parameters<typeof Jsi_assessmentassignmentsService.update>[1];
type ContactChanges = Parameters<typeof ContactsService.update>[1];
type RoleChanges = Parameters<typeof Jsi_roleassignmentsService.update>[1];

export interface ProfileDocument extends RouteDocument {
  entry: RouteEntry;
  step: DocumentStep;
}

export interface ProfileStage {
  id: string;
  name: string;
  order: number;
  documents: ProfileDocument[];
}

export interface CollaboratorProfile {
  collaborator: Collaborator;
  validatorName: string | null;
  registeredByName: string | null;
  validatedOn: string | null;
  stages: ProfileStage[];
  /** Exámenes con los intentos agotados (se les puede habilitar uno nuevo). */
  exhaustedExams: RouteEntry[];
  history: Evidence[];
}

export async function loadCollaboratorProfile(personId: string): Promise<CollaboratorProfile> {
  const overview = await loadCollaboratorsOverview();
  const collaborator = overview.collaborators.find((c) => c.id === personId);
  if (!collaborator) throw new Error('No se encontró al colaborador (puede haber sido dado de baja).');

  const [catalog, people, history, onboarding] = await Promise.all([
    loadOnboardingCatalog(),
    getPeopleById(),
    listEvidence(personId),
    collaborator.onboardingId
      ? Jsi_onboardingsService.get(collaborator.onboardingId, {
          select: ['jsi_onboardingid', '_jsi_validator_value', '_jsi_registeredby_value', 'jsi_validatedon'],
        }).then((result) => unwrap(result, 'Leer inducción'))
      : Promise.resolve(null),
  ]);
  const entries = collaborator.onboardingId ? ((await loadRouteEntries([collaborator.onboardingId])).get(collaborator.onboardingId) ?? []) : [];

  const documents = new Map(catalog.documents.map((item) => [item.document.id, item]));
  const stagesById = new Map(catalog.stages.map((stage) => [stage.id, stage]));
  const stages = new Map<string, ProfileStage>();
  for (const entry of entries) {
    const item = documents.get(entry.documentId);
    if (!item) continue;
    const stageId = entry.stageId ?? item.stageId;
    const stage = stagesById.get(stageId);
    if (!stages.has(stageId)) {
      stages.set(stageId, { id: stageId, name: stage?.name ?? 'Documentación adicional', order: stage?.order ?? 99, documents: [] });
    }
    stages.get(stageId)!.documents.push({ ...item.document, entry, step: documentStep(entry, PROGRAM_RULES.maxAttempts) });
  }

  const nameOf = (id: string | undefined) => (id && people.get(id)?.fullname) || null;
  return {
    collaborator,
    validatorName: nameOf(onboarding?._jsi_validator_value),
    registeredByName: nameOf(onboarding?._jsi_registeredby_value),
    validatedOn: onboarding?.jsi_validatedon ?? null,
    stages: [...stages.values()].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)),
    exhaustedExams: entries.filter((e) => e.exam && isExamExhausted(e.exam, PROGRAM_RULES.maxAttempts)),
    history: history.slice(0, 6),
  };
}

/**
 * Habilita un intento más en los exámenes con intentos agotados: deja los intentos usados
 * en el máximo menos uno y da un nuevo plazo para rendirlo.
 */
export async function grantRetry(onboardingId: string, exams: RouteEntry[]): Promise<void> {
  const dueDate = addCalendarDays(todayIso(), PROGRAM_RULES.examDueDays);
  await Promise.all(
    exams
      .filter((e) => e.examAssignmentId)
      .map(async (e) => {
        const changes: ExamChanges = { jsi_attemptsused: PROGRAM_RULES.maxAttempts - 1, jsi_duedate: dueDate };
        unwrap(await Jsi_assessmentassignmentsService.update(e.examAssignmentId!, changes), 'Habilitar reintento');
      }),
  );
  await saveOnboardingProgress(onboardingId);
}

/**
 * Da de baja a una persona: se desactiva su registro (deja de aparecer en paneles y rutas)
 * y se cierran sus roles. Sus evidencias se conservan para auditoría.
 */
export async function deactivatePerson(personId: string): Promise<void> {
  const today = todayIso();
  const roles = await fetchAll(
    (o) => Jsi_roleassignmentsService.getAll(o),
    { select: ['jsi_roleassignmentid'], filter: `${ACTIVE_RECORDS} and jsi_isactive eq true and _jsi_person_value eq ${personId}` },
    'Leer roles',
  );
  await Promise.all(
    roles.map(async (r) => {
      const changes: RoleChanges = { jsi_isactive: false, jsi_enddate: today };
      unwrap(await Jsi_roleassignmentsService.update(r.jsi_roleassignmentid, changes), 'Cerrar rol');
    }),
  );

  // statecode 1 / statuscode 2 = Inactivo
  const changes = { statecode: 1, statuscode: 2 } as ContactChanges;
  unwrap(await ContactsService.update(personId, changes), 'Dar de baja');
}
