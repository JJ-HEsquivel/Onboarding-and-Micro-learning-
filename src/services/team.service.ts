/**
 * Servicios del Manager sobre su equipo: sumar documentos de la Etapa 3, resultados de
 * exámenes e historial de inducción de un Manager ascendido.
 */
import { Jsi_documentassignmentsService } from '@/generated/services/Jsi_documentassignmentsService';
import { Jsi_assessmentassignmentsService } from '@/generated/services/Jsi_assessmentassignmentsService';
import { Jsi_assessmentattemptsService } from '@/generated/services/Jsi_assessmentattemptsService';
import { Jsi_roleassignmentsService } from '@/generated/services/Jsi_roleassignmentsService';
import { ASSIGNMENT_STATUS, EXAM_STATUS, ROLE } from '@/shared/constants/choices';
import { addCalendarDays, todayIso } from '@/shared/lib/dates';
import type { Collaborator, RouteDocument, RouteStage } from '@/shared/types/onboarding';
import { loadCollaboratorsOverview } from './collaborators.service';
import { ACTIVE_RECORDS, bind, fetchAll, unwrap } from './dataverse';
import { notify } from './notification.service';
import { buildAreaRoute, loadOnboardingCatalog } from './onboardingRoute.service';
import { loadRouteEntries, saveOnboardingProgress, type RouteEntry } from './route.service';

type NewAssignmentRecord = Parameters<typeof Jsi_documentassignmentsService.create>[0];
type NewExamRecord = Parameters<typeof Jsi_assessmentassignmentsService.create>[0];

// ---------------------------------------------------------------------------
// Asignar documentos (solo Etapa 3 del área de cada colaborador)
// ---------------------------------------------------------------------------

export interface AssignableCollaborator {
  collaborator: Collaborator;
  /** Etapas específicas de su área (Etapa 3) con todos sus documentos. */
  areaStages: RouteStage[];
  /** documentId → asignación que ya tiene en su ruta. */
  assigned: Map<string, RouteEntry>;
}

/** Colaboradores activos del equipo con los documentos de Etapa 3 que se les pueden sumar. */
export async function loadAssignableTeam(managerId: string): Promise<AssignableCollaborator[]> {
  const [overview, catalog] = await Promise.all([loadCollaboratorsOverview(managerId), loadOnboardingCatalog()]);
  const active = overview.collaborators.filter((c) => c.status !== 'pendingValidation' && c.onboardingId && c.areaId);
  const routes = await loadRouteEntries(active.map((c) => c.onboardingId!));

  return active.map((collaborator) => ({
    collaborator,
    areaStages: buildAreaRoute(catalog, collaborator.areaId!).filter((stage) => !stage.isGeneral),
    assigned: new Map((routes.get(collaborator.onboardingId!) ?? []).map((entry) => [entry.documentId, entry])),
  }));
}

export interface StageDocumentsInput {
  collaborator: Collaborator;
  stage: RouteStage;
  documents: RouteDocument[];
  /** Días corridos para leerlos. */
  dueDays: number;
  managerName: string;
}

/** Suma documentos a la Etapa 3 de un colaborador, con su examen bloqueado hasta que los lea. */
export async function addStageDocuments(input: StageDocumentsInput): Promise<void> {
  const { collaborator, stage, documents } = input;
  const onboardingId = collaborator.onboardingId;
  if (!onboardingId) throw new Error('El colaborador no tiene una inducción activa.');
  if (documents.length === 0) throw new Error('Seleccione al menos un documento de la Etapa 3.');

  const dueDate = addCalendarDays(todayIso(), Math.max(1, input.dueDays));

  await Promise.all(
    documents.map(async (document) => {
      const record = {
        'jsi_Employee@odata.bind': bind('jsi_persons', collaborator.id),
        'jsi_Document@odata.bind': bind('jsi_documents', document.id),
        'jsi_Stage@odata.bind': bind('jsi_stages', stage.id),
        'jsi_Onboarding@odata.bind': bind('jsi_onboardings', onboardingId),
        jsi_status: ASSIGNMENT_STATUS.Pending,
        jsi_duedate: dueDate,
        jsi_source: `Sumado por ${input.managerName}`.slice(0, 150),
      } as NewAssignmentRecord;
      unwrap(await Jsi_documentassignmentsService.create(record), 'Asignar documento');

      if (document.assessmentId) {
        const exam = {
          'jsi_Employee@odata.bind': bind('jsi_persons', collaborator.id),
          'jsi_Assessment@odata.bind': bind('jsi_assessments', document.assessmentId),
          'jsi_Onboarding@odata.bind': bind('jsi_onboardings', onboardingId),
          jsi_status: EXAM_STATUS.Locked,
          jsi_attemptsused: 0,
        } as NewExamRecord;
        unwrap(await Jsi_assessmentassignmentsService.create(exam), 'Crear examen');
      }
    }),
  );

  // Si ya había terminado, vuelve a estar en curso.
  await saveOnboardingProgress(onboardingId);

  await notify({
    personId: collaborator.id,
    type: 'Reminder',
    title: 'Documentación de Etapa 3 asignada',
    details: `${input.managerName} sumó ${documents.map((d) => d.title).join(', ')} a su Etapa 3. Plazo: ${input.dueDays} día(s).`,
  });
}

// ---------------------------------------------------------------------------
// Resultados de los exámenes del equipo
// ---------------------------------------------------------------------------

export interface TeamResult {
  collaborator: Collaborator;
  documentTitle: string;
  status: 'pending' | 'passed' | 'failed';
  attemptsUsed: number;
  score: number | null;
  /** Fecha y hora ISO del último intento. */
  lastAttemptOn: string | null;
}

export interface TeamResults {
  results: TeamResult[];
  /** Exámenes habilitados (ya leyó el documento). */
  enabled: number;
  taken: number;
  passed: number;
  /** Intentos adicionales tras reprobar. */
  retries: number;
}

export async function loadTeamResults(managerId: string): Promise<TeamResults> {
  const [overview, catalog] = await Promise.all([loadCollaboratorsOverview(managerId), loadOnboardingCatalog()]);
  const active = overview.collaborators.filter((c) => c.onboardingId && c.status !== 'pendingValidation');
  const routes = await loadRouteEntries(active.map((c) => c.onboardingId!));
  const titles = new Map(catalog.documents.map((item) => [item.document.id, item.document.title]));

  const examIds = active.flatMap((c) => (routes.get(c.onboardingId!) ?? []).flatMap((e) => (e.examAssignmentId ? [e.examAssignmentId] : [])));
  const attempts =
    examIds.length === 0
      ? []
      : await fetchAll(
          (o) => Jsi_assessmentattemptsService.getAll(o),
          {
            select: ['_jsi_assignment_value', 'jsi_takenon'],
            filter: `${ACTIVE_RECORDS} and (${examIds.map((id) => `_jsi_assignment_value eq ${id}`).join(' or ')})`,
          },
          'Leer intentos',
        );
  const lastAttempt = new Map<string, string>();
  for (const a of attempts) {
    if (a._jsi_assignment_value && a.jsi_takenon && a.jsi_takenon > (lastAttempt.get(a._jsi_assignment_value) ?? '')) {
      lastAttempt.set(a._jsi_assignment_value, a.jsi_takenon);
    }
  }

  const results = active.flatMap((collaborator) =>
    (routes.get(collaborator.onboardingId!) ?? []).flatMap((entry): TeamResult[] => {
      const exam = entry.exam;
      if (!exam || exam.status === 'locked') return [];
      return [
        {
          collaborator,
          documentTitle: titles.get(entry.documentId) ?? 'Documento',
          status: exam.status,
          attemptsUsed: exam.attemptsUsed,
          score: exam.score,
          lastAttemptOn: (entry.examAssignmentId && lastAttempt.get(entry.examAssignmentId)) || null,
        },
      ];
    }),
  );

  // Primero los reprobados, después los pendientes y al final los aprobados.
  const order = { failed: 0, pending: 1, passed: 2 };
  results.sort((a, b) => order[a.status] - order[b.status]);

  const taken = results.filter((r) => r.score !== null);
  return {
    results,
    enabled: results.length,
    taken: taken.length,
    passed: results.filter((r) => r.status === 'passed').length,
    retries: taken.reduce((sum, r) => sum + Math.max(0, r.attemptsUsed - 1), 0),
  };
}

// ---------------------------------------------------------------------------
// Historial de un Manager ascendido
// ---------------------------------------------------------------------------

export interface PromotionInfo {
  promotedOn: string | null;
  previousJobTitle: string | null;
}

/** Cuándo ascendió a Manager y qué cargo tenía antes (null si es una cuenta base). */
export async function getPromotionInfo(personId: string): Promise<PromotionInfo | null> {
  const roles = await fetchAll(
    (o) => Jsi_roleassignmentsService.getAll(o),
    {
      select: ['jsi_role', 'jsi_isactive', 'jsi_startdate', 'jsi_jobtitle', '_jsi_assignedby_value'],
      filter: `${ACTIVE_RECORDS} and _jsi_person_value eq ${personId}`,
      orderBy: ['createdon desc'],
    },
    'Leer roles',
  );
  const managerRole = roles.find((r) => r.jsi_role === ROLE.Manager && r.jsi_isactive && r._jsi_assignedby_value);
  if (!managerRole) return null;
  const collaboratorRole = roles.find((r) => r.jsi_role === ROLE.Collaborator);
  return { promotedOn: managerRole.jsi_startdate ?? null, previousJobTitle: collaboratorRole?.jsi_jobtitle ?? null };
}
