/**
 * Valores numéricos de las columnas Choice de Dataverse.
 * Los tipos vienen de los modelos generados: si un valor cambia en Dataverse y se
 * regenera con `pac code add-data-source`, TypeScript marcará el error aquí.
 */
import type {
  Contactsjsi_onboardingstatus,
  Contactsjsi_progressstatus,
  Contactsjsi_risklevel,
  Contactsjsi_userrole,
} from '@/generated/models/ContactsModel';
import type { Jsi_stagesjsi_scope } from '@/generated/models/Jsi_stagesModel';
import type { Jsi_documentsjsi_criticality, Jsi_documentsjsi_status } from '@/generated/models/Jsi_documentsModel';
import type { Jsi_documentassignmentsjsi_status } from '@/generated/models/Jsi_documentassignmentsModel';

export const USER_ROLE = {
  Administrator: 100010000,
  Manager: 100010001,
  Collaborator: 100010002,
} as const satisfies Record<string, Contactsjsi_userrole>;

export const ONBOARDING_STATUS = {
  Active: 100000000,
  PendingValidation: 100000001,
} as const satisfies Record<string, Contactsjsi_onboardingstatus>;

export const PROGRESS_STATUS = {
  NotStarted: 100000000,
  InProgress: 100000001,
  Overdue: 100000002,
  Completed: 100000003,
} as const satisfies Record<string, Contactsjsi_progressstatus>;

export const RISK_LEVEL = {
  Low: 100000000,
  Medium: 100000001,
  High: 100000002,
} as const satisfies Record<string, Contactsjsi_risklevel>;

export const STAGE_SCOPE = {
  General: 100000000,
  AreaSpecific: 100000001,
} as const satisfies Record<string, Jsi_stagesjsi_scope>;

export const DOCUMENT_CRITICALITY = {
  High: 100000000,
  Medium: 100000001,
  Low: 100000002,
} as const satisfies Record<string, Jsi_documentsjsi_criticality>;

export const DOCUMENT_STATUS = {
  Current: 100000000,
  Updated: 100000001,
  Draft: 100000002,
} as const satisfies Record<string, Jsi_documentsjsi_status>;

export const ASSIGNMENT_STATUS = {
  Pending: 100000000,
  Read: 100000001,
} as const satisfies Record<string, Jsi_documentassignmentsjsi_status>;
