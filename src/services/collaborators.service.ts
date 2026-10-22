/**
 * Colaboradores: personas (jsi_person) con el rol Collaborator activo, junto con su
 * inducción más reciente (jsi_onboarding) y el avance real de su ruta.
 */
import { Jsi_personsService } from '@/generated/services/Jsi_personsService';
import { Jsi_roleassignmentsService } from '@/generated/services/Jsi_roleassignmentsService';
import { Jsi_onboardingsService } from '@/generated/services/Jsi_onboardingsService';
import { Jsi_documentassignmentsService } from '@/generated/services/Jsi_documentassignmentsService';
import type { Jsi_onboardings } from '@/generated/models/Jsi_onboardingsModel';
import {
  ASSIGNMENT_STATUS,
  ONBOARDING_TYPE,
  PROGRESS_STATUS,
  RISK_LEVEL,
  ROLE,
  VALIDATION_STATUS,
} from '@/shared/constants/choices';
import { PROGRAM_RULES } from '@/shared/constants/program';
import { attentionReasons } from '@/shared/domain/attention';
import { daysBetween, todayIso } from '@/shared/lib/dates';
import type { Area, Collaborator, Manager, NewCollaboratorInput, RouteStage } from '@/shared/types/onboarding';
import { listAreas } from './areas.service';
import { ACTIVE_RECORDS, bind, fetchAll, odataString, unwrap } from './dataverse';
import { lastActivityByPerson } from './evidence.service';
import { loadOnboardingCatalog } from './onboardingRoute.service';
import { getPeopleById, getPersonIdsWithRole, toManagers } from './people.service';
import { loadRouteEntries, progressOf } from './route.service';

// Los tipos generados exigen columnas de sistema (ownerid, statecode...) que Dataverse
// completa solo; por eso los registros nuevos se construyen con estos tipos.
type NewPersonRecord = Parameters<typeof Jsi_personsService.create>[0];
type NewRoleRecord = Parameters<typeof Jsi_roleassignmentsService.create>[0];
type NewOnboardingRecord = Parameters<typeof Jsi_onboardingsService.create>[0];
type NewAssignmentRecord = Parameters<typeof Jsi_documentassignmentsService.create>[0];

/** La inducción más reciente de cada persona (clave: jsi_personid). */
export async function getLatestOnboardings(): Promise<Map<string, Jsi_onboardings>> {
  const onboardings = await fetchAll(
    (o) => Jsi_onboardingsService.getAll(o),
    {
      select: [
        'jsi_onboardingid',
        '_jsi_employee_value',
        'jsi_validationstatus',
        'jsi_startdate',
        'jsi_validatedon',
        'jsi_completedon',
      ],
      filter: ACTIVE_RECORDS,
      orderBy: ['createdon desc'],
    },
    'Leer inducciones',
  );

  const latest = new Map<string, Jsi_onboardings>();
  for (const onboarding of onboardings) {
    const employeeId = onboarding._jsi_employee_value;
    // Vienen ordenadas de la más nueva a la más antigua: se queda la primera.
    if (employeeId && !latest.has(employeeId)) latest.set(employeeId, onboarding);
  }
  return latest;
}

export interface CollaboratorsOverview {
  collaborators: Collaborator[];
  areas: Area[];
  managers: Manager[];
}

/**
 * Colaboradores activos con su avance. Si se indica managerId, solo los de su equipo.
 * Incluye las áreas y los managers (para filtros y selectores).
 */
export async function loadCollaboratorsOverview(managerId?: string): Promise<CollaboratorsOverview> {
  const [people, collaboratorIds, managerIds, areas, onboardings] = await Promise.all([
    getPeopleById(),
    getPersonIdsWithRole(ROLE.Collaborator),
    getPersonIdsWithRole(ROLE.Manager),
    listAreas(),
    getLatestOnboardings(),
  ]);
  const [routes, catalog, lastActivity] = await Promise.all([loadRouteEntries(), loadOnboardingCatalog(), lastActivityByPerson()]);
  const areaNames = new Map(areas.map((area) => [area.id, area.name]));
  const documentTitles = new Map(catalog.documents.map((item) => [item.document.id, item.document.title]));
  const today = todayIso();

  const collaborators = [...collaboratorIds].flatMap((personId): Collaborator[] => {
    const person = people.get(personId);
    if (!person) return [];
    const personManagerId = person._jsi_manager_value ?? null;
    if (managerId && personManagerId !== managerId) return [];

    const areaId = person._jsi_area_value ?? null;
    const onboarding = onboardings.get(personId);
    const entries = onboarding ? (routes.get(onboarding.jsi_onboardingid) ?? []) : [];
    const progress = progressOf(entries);
    const isPending = onboarding?.jsi_validationstatus === VALIDATION_STATUS.PendingValidation;
    const status = isPending ? 'pendingValidation' : progress.status;
    const managerName = (personManagerId && people.get(personManagerId)?.jsi_fullname) || '—';

    return [
      {
        id: personId,
        fullName: person.jsi_fullname ?? '',
        email: person.jsi_email ?? '',
        jobTitle: person.jsi_jobtitle ?? '',
        areaId,
        areaName: (areaId && areaNames.get(areaId)) || '—',
        managerId: personManagerId,
        managerName,
        hireDate: person.jsi_hiredate ?? null,
        onboardingId: onboarding?.jsi_onboardingid ?? null,
        status,
        risk: isPending ? 'low' : progress.risk,
        documentsTotal: progress.total,
        documentsRead: progress.read,
        documentsApproved: progress.approved,
        averageScore: progress.averageScore,
        closingDays:
          progress.status === 'completed' && onboarding?.jsi_startdate && onboarding.jsi_completedon
            ? daysBetween(onboarding.jsi_startdate, onboarding.jsi_completedon)
            : null,
        lastActivity: lastActivity.get(personId) ?? null,
        attentionReasons: attentionReasons({
          status,
          managerName,
          items: entries.map((entry) => ({ ...entry, documentTitle: documentTitles.get(entry.documentId) ?? 'un documento' })),
          lastActivity: lastActivity.get(personId) ?? null,
          activeSince: onboarding?.jsi_validatedon?.slice(0, 10) ?? null,
          today,
          maxAttempts: PROGRAM_RULES.maxAttempts,
          inactivityDays: PROGRAM_RULES.inactivityDays,
        }),
      },
    ];
  });

  // Los más recientes primero (por fecha de ingreso).
  collaborators.sort((a, b) => (b.hireDate ?? '').localeCompare(a.hireDate ?? ''));

  return { collaborators, areas, managers: toManagers(people, managerIds) };
}

/** true si alguna persona activa ya tiene ese correo. */
async function isEmailRegistered(email: string): Promise<boolean> {
  const result = await Jsi_personsService.getAll({
    select: ['jsi_personid'],
    // En OData una comilla simple se escribe doble ('').
    filter: `${ACTIVE_RECORDS} and jsi_email eq ${odataString(email)}`,
    top: 1,
  });
  return unwrap(result, 'Verificar correo').length > 0;
}

/**
 * Registra un colaborador (Etapa 1 del flujo):
 * 1. Crea la persona (jsi_person).
 * 2. Le asigna el rol Collaborator (jsi_roleassignment).
 * 3. Crea su inducción inicial, pendiente de validación por su manager (jsi_onboarding).
 * 4. Le asigna los documentos de la ruta propuesta, en estado Pending (jsi_documentassignment).
 *    Los exámenes se crean recién cuando el Manager valida la ruta.
 *
 * Antes de crear nada verifica que el correo no esté registrado.
 * @param registeredById jsi_personid del Administrador que registra (se le muestra al Manager).
 * Si algún paso falla, se deshace lo creado para no dejar datos a medias.
 */
export async function registerCollaborator(
  input: NewCollaboratorInput,
  route: RouteStage[],
  registeredById: string,
): Promise<string> {
  const email = input.email.trim().toLowerCase();
  if (await isEmailRegistered(email)) {
    throw new Error(`Ya existe una persona registrada con el correo ${email}.`);
  }

  // Acciones para deshacer lo creado, en orden inverso, si algo falla.
  const undo: (() => Promise<unknown>)[] = [];

  try {
    const person = unwrap(
      await Jsi_personsService.create({
        // En jsi_person el nombre completo lo arma la app (en contact lo calculaba Dataverse).
        jsi_fullname: `${input.firstName.trim()} ${input.lastName.trim()}`,
        jsi_firstname: input.firstName.trim(),
        jsi_lastname: input.lastName.trim(),
        jsi_email: email,
        jsi_jobtitle: input.jobTitle.trim(),
        jsi_hiredate: input.hireDate,
        'jsi_Area@odata.bind': bind('jsi_areas', input.areaId),
        'jsi_Manager@odata.bind': bind('jsi_persons', input.managerId),
      } as NewPersonRecord),
      'Registrar persona',
    );
    const personId = person.jsi_personid;
    undo.push(() => Jsi_personsService.delete(personId));

    const role = unwrap(
      await Jsi_roleassignmentsService.create({
        'jsi_Person@odata.bind': bind('jsi_persons', personId),
        jsi_role: ROLE.Collaborator,
        jsi_isactive: true,
        jsi_startdate: input.hireDate,
        jsi_jobtitle: input.jobTitle.trim(),
      } as NewRoleRecord),
      'Asignar rol de colaborador',
    );
    undo.push(() => Jsi_roleassignmentsService.delete(role.jsi_roleassignmentid));

    const onboarding = unwrap(
      await Jsi_onboardingsService.create({
        'jsi_Employee@odata.bind': bind('jsi_persons', personId),
        'jsi_Validator@odata.bind': bind('jsi_persons', input.managerId),
        'jsi_RegisteredBy@odata.bind': bind('jsi_persons', registeredById),
        'jsi_Area@odata.bind': bind('jsi_areas', input.areaId),
        jsi_type: ONBOARDING_TYPE.Initial,
        jsi_validationstatus: VALIDATION_STATUS.PendingValidation,
        jsi_progressstatus: PROGRESS_STATUS.NotStarted,
        jsi_risklevel: RISK_LEVEL.Low,
        jsi_startdate: input.hireDate,
      } as NewOnboardingRecord),
      'Crear inducción',
    );
    const onboardingId = onboarding.jsi_onboardingid;
    undo.push(() => Jsi_onboardingsService.delete(onboardingId));

    const assignments = route.flatMap((stage) =>
      stage.documents.map(
        (document) =>
          ({
            'jsi_Employee@odata.bind': bind('jsi_persons', personId),
            'jsi_Document@odata.bind': bind('jsi_documents', document.id),
            'jsi_Stage@odata.bind': bind('jsi_stages', stage.id),
            'jsi_Onboarding@odata.bind': bind('jsi_onboardings', onboardingId),
            jsi_status: ASSIGNMENT_STATUS.Pending,
            jsi_source: 'Propuesto por el Administrador',
          }) as NewAssignmentRecord,
      ),
    );

    const results = await Promise.allSettled(
      assignments.map(async (record) => unwrap(await Jsi_documentassignmentsService.create(record), 'Asignar documento')),
    );
    for (const result of results) {
      if (result.status === 'fulfilled') {
        const id = result.value.jsi_documentassignmentid;
        undo.push(() => Jsi_documentassignmentsService.delete(id));
      }
    }
    const failed = results.find((result) => result.status === 'rejected');
    if (failed) throw failed.reason;

    return personId;
  } catch (error) {
    for (const action of undo.reverse()) {
      await action().catch(() => undefined);
    }
    throw error instanceof Error ? error : new Error(String(error));
  }
}
