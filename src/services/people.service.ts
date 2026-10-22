/**
 * Personas (jsi_person) y sus roles (jsi_roleassignment).
 */
import { Jsi_personsService } from '@/generated/services/Jsi_personsService';
import { Jsi_roleassignmentsService } from '@/generated/services/Jsi_roleassignmentsService';
import type { Jsi_persons } from '@/generated/models/Jsi_personsModel';
import type { RoleValue } from '@/shared/constants/choices';
import type { SessionUser } from '@/shared/types/navigation';
import type { Manager } from '@/shared/types/onboarding';
import { ACTIVE_RECORDS, fetchAll, odataId, odataString } from './dataverse';

const PERSON_FIELDS = [
  'jsi_personid',
  'jsi_fullname',
  'jsi_email',
  'jsi_jobtitle',
  '_jsi_area_value',
  '_jsi_manager_value',
  'jsi_hiredate',
];

/** Personas activas, indexadas por jsi_personid. */
export async function getPeopleById(): Promise<Map<string, Jsi_persons>> {
  const people = await fetchAll(
    (o) => Jsi_personsService.getAll(o),
    { select: PERSON_FIELDS, filter: ACTIVE_RECORDS, orderBy: ['jsi_fullname asc'] },
    'Leer personas',
  );
  return new Map(people.map((person) => [person.jsi_personid, person]));
}

/** Ids (jsi_personid) de las personas que tienen el rol indicado activo. */
export async function getPersonIdsWithRole(role: RoleValue): Promise<Set<string>> {
  const assignments = await fetchAll(
    (o) => Jsi_roleassignmentsService.getAll(o),
    {
      select: ['_jsi_person_value'],
      filter: `${ACTIVE_RECORDS} and jsi_isactive eq true and jsi_role eq ${role}`,
    },
    'Leer roles',
  );
  return new Set(assignments.flatMap((a) => (a._jsi_person_value ? [a._jsi_person_value] : [])));
}

/** Convierte las personas con rol Manager en opciones para un selector, ordenadas por nombre. */
export function toManagers(people: Map<string, Jsi_persons>, managerIds: Set<string>): Manager[] {
  return [...managerIds]
    .flatMap((id) => {
      const person = people.get(id);
      return person
        ? [{ id, fullName: person.jsi_fullname ?? '', jobTitle: person.jsi_jobtitle ?? '', areaId: person._jsi_area_value ?? null }]
        : [];
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
}

/** La persona activa con ese correo, o null si no está registrada. */
export async function findPersonByEmail(email: string): Promise<SessionUser | null> {
  const rows = await fetchAll(
    (o) => Jsi_personsService.getAll(o),
    {
      select: ['jsi_personid', 'jsi_fullname', 'jsi_jobtitle'],
      filter: `${ACTIVE_RECORDS} and jsi_email eq ${odataString(email.trim())}`,
      top: 1,
    },
    'Buscar persona por correo',
  );
  const person = rows[0];
  return person ? { id: person.jsi_personid, fullName: person.jsi_fullname ?? '', jobTitle: person.jsi_jobtitle ?? '' } : null;
}

/** Roles activos de una persona (valores de jsi_roleassignment.jsi_role). */
export async function getActiveRoles(personId: string): Promise<RoleValue[]> {
  const assignments = await fetchAll(
    (o) => Jsi_roleassignmentsService.getAll(o),
    {
      select: ['jsi_role'],
      filter: `${ACTIVE_RECORDS} and jsi_isactive eq true and _jsi_person_value eq ${odataId(personId)}`,
    },
    'Leer roles de la persona',
  );
  return [...new Set(assignments.map((a) => a.jsi_role as RoleValue))];
}

/** Personas con el rol indicado activo, ordenadas por nombre (para elegir con quién ingresar). */
export async function listPeopleWithRole(role: RoleValue): Promise<SessionUser[]> {
  const [people, ids] = await Promise.all([getPeopleById(), getPersonIdsWithRole(role)]);
  return [...ids]
    .flatMap((id) => {
      const person = people.get(id);
      return person ? [{ id, fullName: person.jsi_fullname ?? '', jobTitle: person.jsi_jobtitle ?? '' }] : [];
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
}
