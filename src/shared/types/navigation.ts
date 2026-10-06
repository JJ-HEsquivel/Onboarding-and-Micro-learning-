import type { ComponentType } from 'react';
import type { LucideIcon } from 'lucide-react';

/** Roles soportados por la aplicación. */
export type UserRole = 'admin' | 'manager' | 'collaborator';

/** Usuario que se muestra en la barra lateral. */
export interface SessionUser {
  fullName: string;
  jobTitle: string;
  initials: string;
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
  /** Texto del breadcrumb (ej. "Administración"). */
  label: string;
  /** Prefijo de las rutas del rol (ej. "/admin"). */
  basePath: string;
  user: SessionUser;
  navigation: NavSection[];
}
