/**
 * Valores numéricos de las columnas Choice de Dataverse.
 * Los tipos vienen de los modelos generados: si un valor cambia en Dataverse y se
 * regenera con `pac code add-data-source`, TypeScript marcará el error aquí.
 */
import type { Jsi_roleassignmentsjsi_role } from '@/generated/models/Jsi_roleassignmentsModel';
import type {
  Jsi_onboardingsjsi_progressstatus,
  Jsi_onboardingsjsi_risklevel,
  Jsi_onboardingsjsi_type,
  Jsi_onboardingsjsi_validationstatus,
} from '@/generated/models/Jsi_onboardingsModel';
import type { Jsi_stagesjsi_scope } from '@/generated/models/Jsi_stagesModel';
import type { Jsi_documentsjsi_criticality, Jsi_documentsjsi_status } from '@/generated/models/Jsi_documentsModel';
import type { Jsi_documentassignmentsjsi_status } from '@/generated/models/Jsi_documentassignmentsModel';

/** jsi_roleassignment.jsi_role */
export const ROLE = {
  Administrator: 100000000,
  Manager: 100000001,
  Collaborator: 100000002,
} as const satisfies Record<string, Jsi_roleassignmentsjsi_role>;

export type RoleValue = (typeof ROLE)[keyof typeof ROLE];

/** jsi_onboarding.jsi_type */
export const ONBOARDING_TYPE = {
  Initial: 100000000,
  RoleChange: 100000001,
} as const satisfies Record<string, Jsi_onboardingsjsi_type>;

/** jsi_onboarding.jsi_validationstatus */
export const VALIDATION_STATUS = {
  PendingValidation: 100000000,
  Validated: 100000001,
} as const satisfies Record<string, Jsi_onboardingsjsi_validationstatus>;

/** jsi_onboarding.jsi_progressstatus */
export const PROGRESS_STATUS = {
  NotStarted: 100000000,
  InProgress: 100000001,
  Overdue: 100000002,
  Completed: 100000003,
} as const satisfies Record<string, Jsi_onboardingsjsi_progressstatus>;

/** jsi_onboarding.jsi_risklevel */
export const RISK_LEVEL = {
  Low: 100000000,
  Medium: 100000001,
  High: 100000002,
} as const satisfies Record<string, Jsi_onboardingsjsi_risklevel>;

/** jsi_stage.jsi_scope */
export const STAGE_SCOPE = {
  General: 100000000,
  AreaSpecific: 100000001,
} as const satisfies Record<string, Jsi_stagesjsi_scope>;

/** jsi_document.jsi_criticality */
export const DOCUMENT_CRITICALITY = {
  High: 100000000,
  Medium: 100000001,
  Low: 100000002,
} as const satisfies Record<string, Jsi_documentsjsi_criticality>;

/** jsi_document.jsi_status */
export const DOCUMENT_STATUS = {
  Current: 100000000,
  Updated: 100000001,
  Draft: 100000002,
} as const satisfies Record<string, Jsi_documentsjsi_status>;

/** jsi_documentassignment.jsi_status */
export const ASSIGNMENT_STATUS = {
  Pending: 100000000,
  Read: 100000001,
} as const satisfies Record<string, Jsi_documentassignmentsjsi_status>;
