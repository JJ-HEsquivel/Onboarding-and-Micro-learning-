/**
 * Valores numéricos de las columnas Choice de Dataverse.
 * El tipo viene del modelo generado por PAC: si un valor cambia en Dataverse,
 * TypeScript marcará el error aquí.
 */
import type { Jsi_roleassignmentsjsi_role } from '@/generated/models/Jsi_roleassignmentsModel';

/** jsi_roleassignment.jsi_role */
export const ROLE = {
  Administrator: 100000000,
  Manager: 100000001,
  Collaborator: 100000002,
} as const satisfies Record<string, Jsi_roleassignmentsjsi_role>;

/** Uno de los tres valores de ROLE: 100000000 | 100000001 | 100000002. */
export type RoleValue = (typeof ROLE)[keyof typeof ROLE];
