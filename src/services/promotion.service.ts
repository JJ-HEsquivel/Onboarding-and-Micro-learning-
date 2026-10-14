/**
 * Managers y ascensos. Solo un Administrador puede ascender a un colaborador a Manager:
 * - Requisito: la inducción completada (todos sus documentos aprobados).
 * - Su rol de Colaborador se desactiva (queda como historial) y se crea su rol de Manager.
 * - Puede recibir un equipo inicial: esos colaboradores (y sus validaciones pendientes) pasan a reportarle.
 * - Queda una evidencia del cambio de rol.
 */
import { ContactsService } from '@/generated/services/ContactsService';
import { Jsi_roleassignmentsService } from '@/generated/services/Jsi_roleassignmentsService';
import { Jsi_onboardingsService } from '@/generated/services/Jsi_onboardingsService';
import { ROLE, VALIDATION_STATUS } from '@/shared/constants/choices';
import { PROGRAM_RULES } from '@/shared/constants/program';
import { todayIso } from '@/shared/lib/dates';
import type { Area, Collaborator } from '@/shared/types/onboarding';
import { loadCollaboratorsOverview } from './collaborators.service';
import { ACTIVE_RECORDS, bind, fetchAll, unwrap } from './dataverse';
import { recordEvidence } from './evidence.service';
import { getPeopleById } from './people.service';

type NewRoleRecord = Parameters<typeof Jsi_roleassignmentsService.create>[0];
type RoleChanges = Parameters<typeof Jsi_roleassignmentsService.update>[1];
type ContactChanges = Parameters<typeof ContactsService.update>[1];
type OnboardingChanges = Parameters<typeof Jsi_onboardingsService.update>[1];

export interface ManagerSummary {
  id: string;
  fullName: string;
  jobTitle: string;
  areaName: string;
  /** "base": cuenta inicial del sistema; "promotion": llegó por ascenso. */
  origin: 'base' | 'promotion';
  promotedOn: string | null;
  team: { total: number; inProgress: number; overdue: number; pendingValidation: number };
}

export interface PromotionCandidate extends Collaborator {
  /** Motivo por el que todavía no puede ascender, o null si es elegible. */
  ineligibleReason: string | null;
}

export interface ManagersOverview {
  managers: ManagerSummary[];
  admins: { id: string; fullName: string; jobTitle: string }[];
  candidates: PromotionCandidate[];
  areas: Area[];
  collaboratorsWithoutManager: number;
}

/** Motivo por el que un colaborador no puede ascender todavía, o null si puede (función pura). */
export function promotionBlocker(c: Collaborator): string | null {
  if (c.status === 'pendingValidation') return 'Su ruta aún no fue validada';
  if (PROGRAM_RULES.requireCompletedOnboardingForPromotion && c.status !== 'completed') {
    return `Debe completar su inducción (${c.documentsApproved}/${c.documentsTotal} documentos)`;
  }
  return null;
}

async function activeRoles() {
  return fetchAll(
    (o) => Jsi_roleassignmentsService.getAll(o),
    {
      select: ['jsi_roleassignmentid', '_jsi_person_value', 'jsi_role', 'jsi_startdate', 'jsi_jobtitle', '_jsi_assignedby_value'],
      filter: `${ACTIVE_RECORDS} and jsi_isactive eq true`,
    },
    'Leer roles',
  );
}

export async function loadManagersOverview(): Promise<ManagersOverview> {
  const [overview, roles, people] = await Promise.all([loadCollaboratorsOverview(), activeRoles(), getPeopleById()]);
  const areaNames = new Map(overview.areas.map((a) => [a.id, a.name]));
  const managerIds = new Set(overview.managers.map((m) => m.id));

  const managers = overview.managers.map((m): ManagerSummary => {
    const role = roles.find((r) => r._jsi_person_value === m.id && r.jsi_role === ROLE.Manager);
    const team = overview.collaborators.filter((c) => c.managerId === m.id);
    return {
      id: m.id,
      fullName: m.fullName,
      jobTitle: m.jobTitle,
      areaName: (m.areaId && areaNames.get(m.areaId)) || '—',
      origin: role?._jsi_assignedby_value ? 'promotion' : 'base',
      promotedOn: role?._jsi_assignedby_value ? (role.jsi_startdate ?? null) : null,
      team: {
        total: team.length,
        inProgress: team.filter((c) => c.status === 'inProgress').length,
        overdue: team.filter((c) => c.status === 'overdue').length,
        pendingValidation: team.filter((c) => c.status === 'pendingValidation').length,
      },
    };
  });

  const admins = roles
    .filter((r) => r.jsi_role === ROLE.Administrator && r._jsi_person_value)
    .flatMap((r) => {
      const person = people.get(r._jsi_person_value!);
      return person ? [{ id: person.contactid, fullName: person.fullname ?? '', jobTitle: person.jsi_jobtitle ?? '' }] : [];
    });

  return {
    managers,
    admins,
    candidates: overview.collaborators.map((c) => ({ ...c, ineligibleReason: promotionBlocker(c) })),
    areas: overview.areas,
    collaboratorsWithoutManager: overview.collaborators.filter((c) => !c.managerId || !managerIds.has(c.managerId)).length,
  };
}

/** Cambia el Manager de varios colaboradores; sus validaciones pendientes pasan al nuevo Manager. */
async function moveCollaborators(collaboratorIds: string[], toManagerId: string): Promise<void> {
  if (collaboratorIds.length === 0) return;

  await Promise.all(
    collaboratorIds.map(async (id) => {
      const changes = { 'jsi_Manager@odata.bind': bind('contacts', toManagerId) } as ContactChanges;
      unwrap(await ContactsService.update(id, changes), 'Cambiar manager');
    }),
  );

  const pending = await fetchAll(
    (o) => Jsi_onboardingsService.getAll(o),
    {
      select: ['jsi_onboardingid'],
      filter:
        `${ACTIVE_RECORDS} and jsi_validationstatus eq ${VALIDATION_STATUS.PendingValidation}` +
        ` and (${collaboratorIds.map((id) => `_jsi_employee_value eq ${id}`).join(' or ')})`,
    },
    'Leer validaciones pendientes',
  );
  await Promise.all(
    pending.map(async (o) => {
      const changes = { 'jsi_Validator@odata.bind': bind('contacts', toManagerId) } as OnboardingChanges;
      unwrap(await Jsi_onboardingsService.update(o.jsi_onboardingid, changes), 'Cambiar validador');
    }),
  );
}

export interface PromotionInput {
  collaborator: Collaborator;
  jobTitle: string;
  areaId: string;
  /** Colaboradores que pasan a reportarle. */
  teamIds: string[];
  admin: { id: string; fullName: string };
}

export async function promoteToManager(input: PromotionInput): Promise<void> {
  const { collaborator, admin } = input;
  const blocker = promotionBlocker(collaborator);
  if (blocker) throw new Error(blocker);

  const today = todayIso();
  const roles = await activeRoles();

  // 1. El rol de Colaborador queda como historial
  await Promise.all(
    roles
      .filter((r) => r._jsi_person_value === collaborator.id && r.jsi_role === ROLE.Collaborator)
      .map(async (r) => {
        const changes: RoleChanges = { jsi_isactive: false, jsi_enddate: today };
        unwrap(await Jsi_roleassignmentsService.update(r.jsi_roleassignmentid, changes), 'Cerrar rol de colaborador');
      }),
  );

  // 2. Nuevo rol de Manager
  unwrap(
    await Jsi_roleassignmentsService.create({
      'jsi_Person@odata.bind': bind('contacts', collaborator.id),
      'jsi_AssignedBy@odata.bind': bind('contacts', admin.id),
      jsi_role: ROLE.Manager,
      jsi_isactive: true,
      jsi_startdate: today,
      jsi_jobtitle: input.jobTitle,
    } as NewRoleRecord),
    'Crear rol de manager',
  );

  // 3. Nuevo cargo y área
  const contactChanges = {
    jsi_jobtitle: input.jobTitle,
    'jsi_Area@odata.bind': bind('jsi_areas', input.areaId),
  } as ContactChanges;
  unwrap(await ContactsService.update(collaborator.id, contactChanges), 'Actualizar cargo');

  // 4. Equipo inicial
  await moveCollaborators(input.teamIds, collaborator.id);

  // 5. Evidencia
  await recordEvidence({
    personId: collaborator.id,
    type: 'RoleChange',
    result: `Aprobado por ${admin.fullName}`,
    description: `Ascenso: ${collaborator.jobTitle || 'Colaborador'} → ${input.jobTitle}`,
  });
}

/** Transfiere colaboradores de un Manager a otro. */
export async function transferTeam(collaboratorIds: string[], toManagerId: string): Promise<void> {
  if (collaboratorIds.length === 0) throw new Error('Seleccione al menos un colaborador.');
  await moveCollaborators(collaboratorIds, toManagerId);
}

/**
 * Revierte un ascenso: el rol de Manager se cierra y vuelve a estar activo su rol de Colaborador
 * con su cargo anterior. Solo si ya no tiene equipo a cargo.
 */
export async function revertPromotion(manager: ManagerSummary, admin: { id: string; fullName: string }): Promise<void> {
  if (manager.origin !== 'promotion') throw new Error('Solo se puede revertir el rol de un Manager ascendido.');
  if (manager.team.total > 0) throw new Error('Primero transfiera su equipo a otro Manager.');

  const today = todayIso();
  const allRoles = await fetchAll(
    (o) => Jsi_roleassignmentsService.getAll(o),
    {
      select: ['jsi_roleassignmentid', 'jsi_role', 'jsi_isactive', 'jsi_jobtitle'],
      filter: `${ACTIVE_RECORDS} and _jsi_person_value eq ${manager.id}`,
      orderBy: ['createdon desc'],
    },
    'Leer roles de la persona',
  );

  const managerRole = allRoles.find((r) => r.jsi_role === ROLE.Manager && r.jsi_isactive);
  const collaboratorRole = allRoles.find((r) => r.jsi_role === ROLE.Collaborator);
  if (!managerRole || !collaboratorRole) throw new Error('No se encontró el historial de roles de esta persona.');

  const closeManager: RoleChanges = { jsi_isactive: false, jsi_enddate: today };
  unwrap(await Jsi_roleassignmentsService.update(managerRole.jsi_roleassignmentid, closeManager), 'Cerrar rol de manager');

  // jsi_enddate en null = vuelve a estar vigente (Dataverse borra el valor al recibir null).
  const reopen = { jsi_isactive: true, jsi_enddate: null } as unknown as RoleChanges;
  unwrap(await Jsi_roleassignmentsService.update(collaboratorRole.jsi_roleassignmentid, reopen), 'Reactivar rol de colaborador');

  const previousTitle = collaboratorRole.jsi_jobtitle || 'Colaborador';
  const contactChanges: ContactChanges = { jsi_jobtitle: previousTitle };
  unwrap(await ContactsService.update(manager.id, contactChanges), 'Restaurar cargo');

  await recordEvidence({
    personId: manager.id,
    type: 'RoleChange',
    result: `Registrado por ${admin.fullName}`,
    description: `Reversión de ascenso: ${manager.jobTitle} → ${previousTitle}`,
  });
}
