import type { RoleValue } from '@/shared/constants/choices';

/** Roles soportados por la aplicación. */
export type UserRole = 'admin' | 'manager' | 'collaborator';

/** Persona con la que se ingresó a la app. */
export interface SessionUser {
  /** contactid en Dataverse. */
  id: string;
  fullName: string;
  jobTitle: string;
}

/** Configuración de un rol. En la parte 2 se le agregará su menú lateral. */
export interface RoleModule {
  role: UserRole;
  /** Valor del rol en Dataverse (jsi_roleassignment.jsi_role). */
  dataverseRole: RoleValue;
  /** Nombre que se muestra (ej. "Administración"). */
  label: string;
  /** Dirección de sus pantallas (ej. "/admin"). */
  basePath: string;
}
