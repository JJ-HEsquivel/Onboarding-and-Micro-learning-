/**
 * Personas (tabla estándar contact) y sus roles (jsi_roleassignment).
 */
import { ContactsService } from '@/generated/services/ContactsService';
import { Jsi_roleassignmentsService } from '@/generated/services/Jsi_roleassignmentsService';
import type { Contacts } from '@/generated/models/ContactsModel';
import type { RoleValue } from '@/shared/constants/choices';
import type { SessionUser } from '@/shared/types/navigation';
import type { Manager } from '@/shared/types/onboarding';
import { ACTIVE_RECORDS, fetchAll } from './dataverse';

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
      return person ? [{ id, fullName: person.fullname ?? '' }] : [];
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
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
