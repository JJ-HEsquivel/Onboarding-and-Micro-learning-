/**
 * Textos y colores de la gestión de contenido (documentos, etapas, evaluaciones).
 * Se usan en las pantallas Documentos, Rutas de aprendizaje y Evaluaciones.
 */
import type { BadgeTone } from '@/shared/components/Badge';
import type { ChangeLevel } from '@/shared/domain/documentVersion';
import type { Criticality, DocumentStatus, Stage } from '@/shared/types/content';
import type { Area } from '@/shared/types/onboarding';

export const DOCUMENT_STATUS_LABEL: Record<DocumentStatus, { label: string; tone: BadgeTone }> = {
  current: { label: 'Vigente', tone: 'success' },
  updated: { label: 'Actualizado', tone: 'info' },
  draft: { label: 'Borrador', tone: 'neutral' },
};

export const CRITICALITY_LABEL: Record<Criticality, { label: string; tone: BadgeTone }> = {
  high: { label: 'Alta', tone: 'danger' },
  medium: { label: 'Media', tone: 'warning' },
  low: { label: 'Baja', tone: 'neutral' },
};

export const CHANGE_LEVEL_LABEL: Record<ChangeLevel, string> = {
  major: 'Cambio mayor',
  minor: 'Cambio menor',
};

/** "General (todas las áreas)" o los nombres de sus áreas. */
export function stageScopeLabel(stage: Stage, areas: Area[]): string {
  if (stage.isGeneral) return 'General · todas las áreas';
  const names = stage.areaIds.map((id) => areas.find((a) => a.id === id)?.name).filter(Boolean);
  return names.length ? names.join(', ') : 'Sin áreas asignadas';
}

/** Texto de un campo numérico opcional → número entero, null si está vacío, NaN si no es válido. */
export function parseOptionalInt(text: string): number | null {
  const value = text.trim();
  if (!value) return null;
  return /^\d+$/.test(value) ? Number(value) : Number.NaN;
}
