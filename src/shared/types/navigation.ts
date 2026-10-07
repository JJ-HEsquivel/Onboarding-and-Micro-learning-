import type { ComponentType } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { RoleValue } from '@/shared/constants/choices';

/** Roles soportados por la aplicación. */
export type UserRole = 'admin' | 'manager' | 'collaborator';

/** Persona con la que se ingresó a la app (se muestra en la barra lateral). */
export interface SessionUser {
  /** contactid en Dataverse. */
  id: string;
  fullName: string;
  jobTitle: string;
}

/** Una opción de la barra lateral: también define la ruta y la pantalla que se muestra. */
export interface NavItem {
  /** Segmento de la ruta, relativo al basePath del rol (ej. "documentos"). */
  path: string;
  label: string;
  icon: LucideIcon;
  /** Pantalla que se renderiza al seleccionar la opción. */
  page: ComponentType;
  /** Contador opcional (ej. pendientes). */
  badge?: number;
}

/** Grupo de opciones con título (ej. "OPERACIÓN"). */
export interface NavSection {
  title: string;
  items: NavItem[];
}

/** Configuración completa de un rol: única fuente de verdad para su menú y sus rutas. */
export interface RoleModule {
  role: UserRole;
  /** Valor del rol en Dataverse (jsi_roleassignment.jsi_role). */
  dataverseRole: RoleValue;
  /** Texto del breadcrumb (ej. "Administración"). */
  label: string;
  /** Prefijo de las rutas del rol (ej. "/admin"). */
  basePath: string;
  navigation: NavSection[];
}
