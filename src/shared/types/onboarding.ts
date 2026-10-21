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
  jobTitle: string;
  areaId: string | null;
}

/** Estado visible de un colaborador en su inducción. */
export type CollaboratorStatus = 'pendingValidation' | 'notStarted' | 'inProgress' | 'overdue' | 'completed';

/** Nivel de riesgo de una inducción. */
export type RiskLevel = 'low' | 'medium' | 'high';

/** Resumen numérico del avance de una inducción (ver shared/domain/onboardingProgress.ts). */
export interface ProgressSummary {
  /** Documentos de la ruta. */
  total: number;
  /** Documentos con la lectura confirmada. */
  read: number;
  /** Documentos leídos y con su examen aprobado: son los que "suman". */
  approved: number;
  /** Exámenes habilitados que falta rendir (o reintentar). */
  examsToTake: number;
  /** Promedio de los exámenes rendidos, o null si no rindió ninguno. */
  averageScore: number | null;
  status: Exclude<CollaboratorStatus, 'pendingValidation'>;
  risk: RiskLevel;
}

export interface Collaborator {
  id: string;
  fullName: string;
  email: string;
  jobTitle: string;
  areaId: string | null;
  areaName: string;
  managerId: string | null;
  managerName: string;
  /** Fecha en formato ISO "AAAA-MM-DD". */
  hireDate: string | null;
  /** Inducción más reciente (jsi_onboarding). */
  onboardingId: string | null;
  status: CollaboratorStatus;
  risk: RiskLevel;
  documentsTotal: number;
  documentsRead: number;
  documentsApproved: number;
  averageScore: number | null;
  /** Duración de la inducción en días, solo si ya se cerró. */
  closingDays: number | null;
  /** Fecha "AAAA-MM-DD" de su última lectura o examen, o null. */
  lastActivity: string | null;
  /** Motivos por los que requiere atención (vacío si está todo en orden). */
  attentionReasons: string[];
}

export interface RouteDocument {
  id: string;
  code: string;
  title: string;
  version: string;
  readingMinutes: number | null;
  isCritical: boolean;
  /** En la Etapa 3: si el Admin lo propone por defecto. En etapas generales siempre es true. */
  isDefault: boolean;
  /** Evaluación del documento, o null si no tiene. */
  assessmentId: string | null;
}

/** Una etapa de la ruta de inducción con los documentos que le corresponden. */
export interface RouteStage {
  id: string;
  name: string;
  order: number;
  /** true en las etapas obligatorias para todos (1 y 2). */
  isGeneral: boolean;
  /** Plazo de la etapa en días hábiles (null si no tiene plazo). */
  businessDays: number | null;
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
