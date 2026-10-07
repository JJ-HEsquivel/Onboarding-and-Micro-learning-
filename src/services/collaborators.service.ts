/**
 * Colaboradores: personas (contact) con el rol Collaborator activo, junto con su
 * inducción más reciente (jsi_onboarding) y el avance de sus documentos.
 */
import { ContactsService } from '@/generated/services/ContactsService';
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
import { daysBetween } from '@/shared/lib/dates';
import type {
  Area,
  Collaborator,
  CollaboratorStatus,
  Manager,
  NewCollaboratorInput,
  RouteStage,
} from '@/shared/types/onboarding';
import { listAreas } from './areas.service';
import { ACTIVE_RECORDS, bind, fetchAll, unwrap } from './dataverse';
import { getPeopleById, getPersonIdsWithRole, toManagers } from './people.service';

// Los tipos generados exigen columnas de sistema (ownerid, statecode...) que Dataverse
// completa solo; por eso los registros nuevos se construyen con estos tipos.
type NewContactRecord = Parameters<typeof ContactsService.create>[0];
type NewRoleRecord = Parameters<typeof Jsi_roleassignmentsService.create>[0];
type NewOnboardingRecord = Parameters<typeof Jsi_onboardingsService.create>[0];
type NewAssignmentRecord = Parameters<typeof Jsi_documentassignmentsService.create>[0];

function toStatus(onboarding: Jsi_onboardings | undefined): CollaboratorStatus {
  if (!onboarding) return 'notStarted';
  if (onboarding.jsi_validationstatus === VALIDATION_STATUS.PendingValidation) return 'pendingValidation';
  switch (onboarding.jsi_progressstatus) {
    case PROGRESS_STATUS.InProgress:
      return 'inProgress';
    case PROGRESS_STATUS.Overdue:
      return 'overdue';
    case PROGRESS_STATUS.Completed:
      return 'completed';
    default:
      return 'notStarted';
  }
}

/** La inducción más reciente de cada persona (clave: contactid). */
async function getLatestOnboardings(): Promise<Map<string, Jsi_onboardings>> {
  const onboardings = await fetchAll(
    (o) => Jsi_onboardingsService.getAll(o),
    {
      select: [
        'jsi_onboardingid',
        '_jsi_employee_value',
        'jsi_validationstatus',
        'jsi_progressstatus',
        'jsi_startdate',
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

/** Documentos asignados y leídos por inducción (clave: jsi_onboardingid). */
async function getDocumentProgress(): Promise<Map<string, { total: number; read: number }>> {
  const assignments = await fetchAll(
    (o) => Jsi_documentassignmentsService.getAll(o),
    { select: ['_jsi_onboarding_value', 'jsi_status'], filter: ACTIVE_RECORDS },
    'Leer asignaciones de documentos',
  );

  const progress = new Map<string, { total: number; read: number }>();
  for (const assignment of assignments) {
    const onboardingId = assignment._jsi_onboarding_value;
    if (!onboardingId) continue;
    const entry = progress.get(onboardingId) ?? { total: 0, read: 0 };
    entry.total++;
    if (assignment.jsi_status === ASSIGNMENT_STATUS.Read) entry.read++;
    progress.set(onboardingId, entry);
  }
  return progress;
}

export interface CollaboratorsOverview {
  collaborators: Collaborator[];
  areas: Area[];
  managers: Manager[];
}

/** Todo lo que necesita la pantalla de colaboradores, en una sola llamada. */
export async function loadCollaboratorsOverview(): Promise<CollaboratorsOverview> {
  const [people, collaboratorIds, managerIds, areas, onboardings, progress] = await Promise.all([
    getPeopleById(),
    getPersonIdsWithRole(ROLE.Collaborator),
    getPersonIdsWithRole(ROLE.Manager),
    listAreas(),
    getLatestOnboardings(),
    getDocumentProgress(),
  ]);

  const areaNames = new Map(areas.map((area) => [area.id, area.name]));

  const collaborators = [...collaboratorIds].flatMap((personId): Collaborator[] => {
    const person = people.get(personId);
    if (!person) return [];

    const areaId = person._jsi_area_value ?? null;
    const managerId = person._jsi_manager_value ?? null;
    const onboarding = onboardings.get(personId);
    const documents = onboarding ? progress.get(onboarding.jsi_onboardingid) : undefined;
    const status = toStatus(onboarding);

    return [
      {
        id: personId,
        fullName: person.fullname ?? '',
        jobTitle: person.jsi_jobtitle ?? '',
        areaId,
        areaName: (areaId && areaNames.get(areaId)) || '—',
        managerId,
        managerName: (managerId && people.get(managerId)?.fullname) || '—',
        hireDate: person.jsi_hiredate ?? null,
        onboardingId: onboarding?.jsi_onboardingid ?? null,
        status,
        closingDays:
          status === 'completed' && onboarding?.jsi_startdate && onboarding.jsi_completedon
            ? daysBetween(onboarding.jsi_startdate, onboarding.jsi_completedon)
            : null,
        documentsTotal: documents?.total ?? 0,
        documentsRead: documents?.read ?? 0,
      },
    ];
  });

  // Los más recientes primero (por fecha de ingreso).
  collaborators.sort((a, b) => (b.hireDate ?? '').localeCompare(a.hireDate ?? ''));

  return { collaborators, areas, managers: toManagers(people, managerIds) };
}

/** true si alguna persona activa ya tiene ese correo. */
async function isEmailRegistered(email: string): Promise<boolean> {
  const result = await ContactsService.getAll({
    select: ['contactid'],
    // En OData una comilla simple se escribe doble ('').
    filter: `${ACTIVE_RECORDS} and emailaddress1 eq '${email.replace(/'/g, "''")}'`,
    top: 1,
  });
  return unwrap(result, 'Verificar correo').length > 0;
}

/**
 * Registra un colaborador (Etapa 1 del flujo):
 * 1. Crea la persona (contact).
 * 2. Le asigna el rol Collaborator (jsi_roleassignment).
 * 3. Crea su inducción inicial, pendiente de validación por su manager (jsi_onboarding).
 * 4. Le asigna los documentos de la ruta de su área, en estado Pending (jsi_documentassignment).
 *
 * Antes de crear nada verifica que el correo no esté registrado.
 * @param registeredById contactid del Administrador que registra (se le muestra al Manager).
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
      await ContactsService.create({
        firstname: input.firstName.trim(),
        lastname: input.lastName.trim(),
        emailaddress1: email,
        jsi_jobtitle: input.jobTitle.trim(),
        jsi_hiredate: input.hireDate,
        'jsi_Area@odata.bind': bind('jsi_areas', input.areaId),
        'jsi_Manager@odata.bind': bind('contacts', input.managerId),
      } as NewContactRecord),
      'Registrar persona',
    );
    const personId = person.contactid;
    undo.push(() => ContactsService.delete(personId));

    const role = unwrap(
      await Jsi_roleassignmentsService.create({
        'jsi_Person@odata.bind': bind('contacts', personId),
        jsi_role: ROLE.Collaborator,
        jsi_isactive: true,
        jsi_startdate: input.hireDate,
      } as NewRoleRecord),
      'Asignar rol de colaborador',
    );
    undo.push(() => Jsi_roleassignmentsService.delete(role.jsi_roleassignmentid));

    const onboarding = unwrap(
      await Jsi_onboardingsService.create({
        'jsi_Employee@odata.bind': bind('contacts', personId),
        'jsi_Validator@odata.bind': bind('contacts', input.managerId),
        'jsi_RegisteredBy@odata.bind': bind('contacts', registeredById),
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
            'jsi_Employee@odata.bind': bind('contacts', personId),
            'jsi_Document@odata.bind': bind('jsi_documents', document.id),
            'jsi_Stage@odata.bind': bind('jsi_stages', stage.id),
            'jsi_Onboarding@odata.bind': bind('jsi_onboardings', onboardingId),
            jsi_status: ASSIGNMENT_STATUS.Pending,
            jsi_source: 'Ruta propuesta por área',
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
