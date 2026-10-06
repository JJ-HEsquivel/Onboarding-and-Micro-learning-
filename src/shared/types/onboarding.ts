/**
 * Modelos de dominio que usa la interfaz.
 * Son independientes de los nombres de columnas de Dataverse (jsi_..., _xxx_value):
 * la traducción se hace en src/services.
 */

export interface Area {
  id: string;
  name: string;
  code: string;
}

export interface Manager {
  id: string;
  fullName: string;
}

/** Estado visible de un colaborador en su inducción. */
export type CollaboratorStatus = 'pendingValidation' | 'notStarted' | 'inProgress' | 'overdue' | 'completed';

export interface Collaborator {
  id: string;
  fullName: string;
  jobTitle: string;
  areaId: string | null;
  areaName: string;
  managerId: string | null;
  managerName: string;
  /** Fecha en formato ISO "AAAA-MM-DD". */
  hireDate: string | null;
  /** Datos de su inducción más reciente (jsi_onboarding). */
  onboardingId: string | null;
  status: CollaboratorStatus;
  /** Duración de la inducción en días, solo si ya se cerró. */
  closingDays: number | null;
  documentsTotal: number;
  documentsRead: number;
}

export interface RouteDocument {
  id: string;
  code: string;
  title: string;
  version: string;
  readingMinutes: number | null;
  isCritical: boolean;
}

/** Una etapa de la ruta de inducción con los documentos que le corresponden. */
export interface RouteStage {
  id: string;
  name: string;
  order: number;
  documents: RouteDocument[];
}

export interface NewCollaboratorInput {
  firstName: string;
  lastName: string;
  /** Correo corporativo; identifica a la persona al iniciar sesión, por eso es único. */
  email: string;
  jobTitle: string;
  areaId: string;
  managerId: string;
  /** Fecha en formato ISO "AAAA-MM-DD". */
  hireDate: string;
}
