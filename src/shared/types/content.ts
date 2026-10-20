/**
 * Modelos de dominio de la gestión de contenido (fase 4): etapas, documentos, versiones
 * y evaluaciones. Igual que onboarding.ts, no usan nombres de columnas de Dataverse.
 */
import type { ChangeLevel } from '@/shared/domain/documentVersion';

export type Criticality = 'high' | 'medium' | 'low';

/** Vigente · Actualizado (tiene una versión nueva) · Borrador (no se asigna a nadie). */
export type DocumentStatus = 'current' | 'updated' | 'draft';

/** Una etapa del programa de inducción (jsi_stage). */
export interface Stage {
  id: string;
  name: string;
  order: number;
  /** true: obligatoria para todas las áreas. false: solo para las áreas indicadas. */
  isGeneral: boolean;
  /** Plazo en días hábiles (null si no tiene plazo). */
  businessDays: number | null;
  /** Áreas a las que aplica (solo si no es general). */
  areaIds: string[];
}

export type StageInput = Omit<Stage, 'id'>;

export interface DocumentCategory {
  id: string;
  name: string;
}

/** Documento tal como lo gestiona el Administrador. */
export interface ManagedDocument {
  id: string;
  code: string;
  title: string;
  version: string;
  status: DocumentStatus;
  stageId: string | null;
  categoryId: string | null;
  criticality: Criticality;
  /** En etapas por área: si se propone por defecto al registrar a alguien. */
  isDefault: boolean;
  readingMinutes: number | null;
  pages: number | null;
  owner: string;
  summary: string;
  /** "AAAA-MM-DD" */
  updatedOn: string | null;
  /** Áreas destinatarias. Vacío = aplica a todas las áreas de su etapa. */
  areaIds: string[];
  /** Evaluación del documento, o null si todavía no tiene. */
  assessmentId: string | null;
  /** Preguntas activas de su evaluación. */
  questionCount: number;
}

/** Datos del formulario de alta/edición de un documento. */
export interface DocumentInput {
  code: string;
  title: string;
  stageId: string;
  categoryId: string;
  criticality: Criticality;
  /** Un borrador no se asigna a nadie hasta publicarlo. */
  isDraft: boolean;
  isDefault: boolean;
  readingMinutes: number | null;
  pages: number | null;
  owner: string;
  summary: string;
  /** Texto del lector: "## Título de sección" seguido de sus párrafos. */
  content: string;
  areaIds: string[];
}

/** Una versión del historial de un documento (jsi_documentversion). */
export interface DocumentVersionEntry {
  id: string;
  version: string;
  level: ChangeLevel;
  /** "AAAA-MM-DD" */
  releaseDate: string | null;
  details: string;
}

/** Configuración de una evaluación (jsi_assessment). */
export interface AssessmentSettings {
  /** Puntaje mínimo para aprobar (%). */
  passingScore: number;
  maxAttempts: number;
  durationMinutes: number;
}
