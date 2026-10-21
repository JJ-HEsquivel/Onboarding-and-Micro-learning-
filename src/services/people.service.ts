/**
 * Personas (tabla estándar contact) y sus roles (jsi_roleassignment).
 */
import { ContactsService } from '@/generated/services/ContactsService';
import { Jsi_roleassignmentsService } from '@/generated/services/Jsi_roleassignmentsService';
import type { Contacts } from '@/generated/models/ContactsModel';
import type { RoleValue } from '@/shared/constants/choices';
import type { SessionUser } from '@/shared/types/navigation';
import type { Manager } from '@/shared/types/onboarding';
import { ACTIVE_RECORDS, fetchAll, odataId, odataString } from './dataverse';

const PERSON_FIELDS = [
  'contactid',
  'fullname',
  'emailaddress1',
  'jsi_jobtitle',
  '_jsi_area_value',
  '_jsi_manager_value',
  'jsi_hiredate',
];

/** Personas activas, indexadas por contactid. */
export async function getPeopleById(): Promise<Map<string, Contacts>> {
  const people = await fetchAll(
    (o) => ContactsService.getAll(o),
    { select: PERSON_FIELDS, filter: ACTIVE_RECORDS, orderBy: ['fullname asc'] },
    'Leer personas',
  );
  return new Map(people.map((person) => [person.contactid, person]));
}

/** Ids (contactid) de las personas que tienen el rol indicado activo. */
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
export function toManagers(people: Map<string, Contacts>, managerIds: Set<string>): Manager[] {
  return [...managerIds]
    .flatMap((id) => {
      const person = people.get(id);
      return person
        ? [{ id, fullName: person.fullname ?? '', jobTitle: person.jsi_jobtitle ?? '', areaId: person._jsi_area_value ?? null }]
        : [];
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
}

/** La persona activa con ese correo, o null si no está registrada. */
export async function findPersonByEmail(email: string): Promise<SessionUser | null> {
  const rows = await fetchAll(
    (o) => ContactsService.getAll(o),
    {
      select: ['contactid', 'fullname', 'jsi_jobtitle'],
      filter: `${ACTIVE_RECORDS} and emailaddress1 eq ${odataString(email.trim())}`,
      top: 1,
    },
    'Buscar persona por correo',
  );
  const person = rows[0];
  return person ? { id: person.contactid, fullName: person.fullname ?? '', jobTitle: person.jsi_jobtitle ?? '' } : null;
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
      return person ? [{ id, fullName: person.fullname ?? '', jobTitle: person.jsi_jobtitle ?? '' }] : [];
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
}
