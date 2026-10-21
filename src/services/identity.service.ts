/**
 * Identidad real de quien abrió la app.
 *
 * Power Apps exige iniciar sesión con la cuenta de la empresa (Microsoft Entra ID, con la
 * MFA que tenga configurada el tenant) antes de abrir cualquier app. El SDK entrega esa
 * cuenta con getContext(); aquí se busca a la persona por su correo y se leen sus roles.
 *
 * Importante: esto decide QUÉ MENÚ ve cada uno. Lo que cada cuenta puede leer o escribir en
 * Dataverse lo hacen cumplir, del lado del servidor, los roles de seguridad de Dataverse.
 */
import { getContext } from '@microsoft/power-apps/app';
import type { RoleValue } from '@/shared/constants/choices';
import type { SessionUser } from '@/shared/types/navigation';
import { findPersonByEmail, getActiveRoles } from './people.service';

export interface Identity {
  /** Cuenta con la que se inició sesión (userPrincipalName, normalmente el correo). */
  account: string;
  /** La persona registrada con ese correo, o null si no está registrada. */
  person: SessionUser | null;
  /** Roles activos de la persona (vacío si no tiene ninguno). */
  roles: RoleValue[];
}

export async function loadIdentity(): Promise<Identity> {
  const { user } = await getContext();
  const account = user.userPrincipalName?.trim() ?? '';
  if (!account) throw new Error('Power Apps no informó con qué cuenta se inició sesión.');

  const person = await findPersonByEmail(account);
  const roles = person ? await getActiveRoles(person.id) : [];
  return { account, person, roles };
}
