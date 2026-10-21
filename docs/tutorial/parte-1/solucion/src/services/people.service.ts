/**
 * Personas (tabla estándar contact) y sus roles (jsi_roleassignment).
 */
import { ContactsService } from '@/generated/services/ContactsService';
import { Jsi_roleassignmentsService } from '@/generated/services/Jsi_roleassignmentsService';
import type { Contacts } from '@/generated/models/ContactsModel';
import type { RoleValue } from '@/shared/constants/choices';
import type { SessionUser } from '@/shared/types/navigation';
import { ACTIVE_RECORDS, fetchAll } from './dataverse';

/** Columnas de contact que necesitamos (como el SELECT de una consulta). */
const PERSON_FIELDS = ['contactid', 'fullname', 'jsi_jobtitle'];

/** Personas activas, indexadas por contactid. */
async function getPeopleById(): Promise<Map<string, Contacts>> {
  const people = await fetchAll(
    (o) => ContactsService.getAll(o),
    { select: PERSON_FIELDS, filter: ACTIVE_RECORDS },
    'Leer personas',
  );
  return new Map(people.map((person) => [person.contactid, person]));
}

/** Ids (contactid) de las personas que tienen el rol indicado activo. */
async function getPersonIdsWithRole(role: RoleValue): Promise<Set<string>> {
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
