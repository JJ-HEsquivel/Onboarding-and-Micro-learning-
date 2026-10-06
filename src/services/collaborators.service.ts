/**
 * Colaboradores y managers (tabla estándar contact) y sus asignaciones de documentos.
 */
import { ContactsService } from '@/generated/services/ContactsService';
import { Jsi_documentassignmentsService } from '@/generated/services/Jsi_documentassignmentsService';
import type { Contacts } from '@/generated/models/ContactsModel';
import {
  ASSIGNMENT_STATUS,
  ONBOARDING_STATUS,
  PROGRESS_STATUS,
  RISK_LEVEL,
  USER_ROLE,
} from '@/shared/constants/choices';
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

// Los tipos generados exigen columnas de sistema (ownerid, statecode...) que Dataverse
// completa solo; por eso los registros nuevos se construyen con estos tipos.
type NewContactRecord = Parameters<typeof ContactsService.create>[0];
type NewAssignmentRecord = Parameters<typeof Jsi_documentassignmentsService.create>[0];

const COLLABORATOR_FIELDS = [
  'contactid',
  'fullname',
  'jsi_jobtitle',
  '_jsi_area_value',
  '_jsi_manager_value',
  'jsi_hiredate',
  'jsi_onboardingstatus',
  'jsi_progressstatus',
];

function toStatus(contact: Contacts): CollaboratorStatus {
  if (contact.jsi_onboardingstatus === ONBOARDING_STATUS.PendingValidation) return 'pendingValidation';
  switch (contact.jsi_progressstatus) {
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

/** Contactos con el rol Manager, para asignarlos como responsables. */
export async function listManagers(): Promise<Manager[]> {
  const rows = await fetchAll(
    (o) => ContactsService.getAll(o),
    {
      select: ['contactid', 'fullname'],
      filter: `${ACTIVE_RECORDS} and jsi_userrole eq ${USER_ROLE.Manager}`,
      orderBy: ['fullname asc'],
    },
    'Leer managers',
  );

  return rows.map((row) => ({ id: row.contactid, fullName: row.fullname ?? '' }));
}

/** Cantidad de documentos asignados y leídos por colaborador (clave: contactid). */
async function getDocumentProgress(): Promise<Map<string, { total: number; read: number }>> {
  const assignments = await fetchAll(
    (o) => Jsi_documentassignmentsService.getAll(o),
    { select: ['_jsi_employee_value', 'jsi_status'], filter: ACTIVE_RECORDS },
    'Leer asignaciones de documentos',
  );

  const progress = new Map<string, { total: number; read: number }>();
  for (const assignment of assignments) {
    const employeeId = assignment._jsi_employee_value;
    if (!employeeId) continue;
    const entry = progress.get(employeeId) ?? { total: 0, read: 0 };
    entry.total++;
    if (assignment.jsi_status === ASSIGNMENT_STATUS.Read) entry.read++;
    progress.set(employeeId, entry);
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
  const [contacts, areas, managers, progress] = await Promise.all([
    fetchAll(
      (o) => ContactsService.getAll(o),
      {
        select: COLLABORATOR_FIELDS,
        filter: `${ACTIVE_RECORDS} and jsi_userrole eq ${USER_ROLE.Collaborator}`,
        orderBy: ['createdon desc'],
      },
      'Leer colaboradores',
    ),
    listAreas(),
    listManagers(),
    getDocumentProgress(),
  ]);

  const areaNames = new Map(areas.map((area) => [area.id, area.name]));
  const managerNames = new Map(managers.map((manager) => [manager.id, manager.fullName]));

  const collaborators = contacts.map((contact): Collaborator => {
    const areaId = contact._jsi_area_value ?? null;
    const managerId = contact._jsi_manager_value ?? null;
    const documents = progress.get(contact.contactid);

    return {
      id: contact.contactid,
      fullName: contact.fullname ?? '',
      jobTitle: contact.jsi_jobtitle ?? '',
      areaId,
      areaName: (areaId && areaNames.get(areaId)) || '—',
      managerId,
      managerName: (managerId && managerNames.get(managerId)) || '—',
      hireDate: contact.jsi_hiredate ?? null,
      status: toStatus(contact),
      documentsTotal: documents?.total ?? 0,
      documentsRead: documents?.read ?? 0,
    };
  });

  return { collaborators, areas, managers };
}

/**
 * Registra un colaborador (Etapa 1 del flujo) y le asigna los documentos de su ruta.
 *
 * - El colaborador queda "PendingValidation" hasta que su Manager lo valide.
 * - Las asignaciones se crean en estado "Pending".
 * - Si alguna asignación falla, se deshace lo creado para no dejar datos a medias.
 */
export async function registerCollaborator(input: NewCollaboratorInput, route: RouteStage[]): Promise<string> {
  const contactRecord = {
    firstname: input.firstName.trim(),
    lastname: input.lastName.trim(),
    jsi_jobtitle: input.jobTitle.trim(),
    jsi_hiredate: input.hireDate,
    'jsi_Area@odata.bind': bind('jsi_areas', input.areaId),
    'jsi_Manager@odata.bind': bind('contacts', input.managerId),
    jsi_userrole: USER_ROLE.Collaborator,
    jsi_onboardingstatus: ONBOARDING_STATUS.PendingValidation,
    jsi_progressstatus: PROGRESS_STATUS.NotStarted,
    jsi_risklevel: RISK_LEVEL.Low,
  } as NewContactRecord;

  const contact = unwrap(await ContactsService.create(contactRecord), 'Registrar colaborador');
  const contactId = contact.contactid;

  const assignments = route.flatMap((stage) =>
    stage.documents.map(
      (document) =>
        ({
          'jsi_Employee@odata.bind': bind('contacts', contactId),
          'jsi_Document@odata.bind': bind('jsi_documents', document.id),
          'jsi_Stage@odata.bind': bind('jsi_stages', stage.id),
          jsi_status: ASSIGNMENT_STATUS.Pending,
          jsi_source: 'Ruta propuesta por área',
        }) as NewAssignmentRecord,
    ),
  );

  const results = await Promise.allSettled(
    assignments.map(async (record) =>
      unwrap(await Jsi_documentassignmentsService.create(record), 'Asignar documento'),
    ),
  );

  const failed = results.find((result) => result.status === 'rejected');
  if (failed) {
    const createdIds = results.flatMap((result) =>
      result.status === 'fulfilled' ? [result.value.jsi_documentassignmentid] : [],
    );
    await Promise.allSettled(createdIds.map((id) => Jsi_documentassignmentsService.delete(id)));
    await ContactsService.delete(contactId).catch(() => undefined);
    throw failed.reason instanceof Error ? failed.reason : new Error(String(failed.reason));
  }

  return contactId;
}
