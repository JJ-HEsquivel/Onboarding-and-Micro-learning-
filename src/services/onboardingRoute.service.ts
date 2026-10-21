/**
 * Ruta de inducción: qué etapas y documentos le corresponden a un área.
 * Fuente: jsi_stage, jsi_stagearea, jsi_document, jsi_documentarea y jsi_assessment.
 *
 * Reglas del programa:
 * - Etapas "General" (1 y 2): obligatorias para todos.
 * - Etapa "AreaSpecific" (3): una por área. El Admin propone los documentos marcados como
 *   "por defecto" (jsi_isdefault) y el Manager, al validar, puede quitar esos o sumar los demás.
 * - Cada documento tiene su propia evaluación (jsi_assessment de tipo Document).
 */
import { Jsi_stagesService } from '@/generated/services/Jsi_stagesService';
import { Jsi_stageareasService } from '@/generated/services/Jsi_stageareasService';
import { Jsi_documentsService } from '@/generated/services/Jsi_documentsService';
import { Jsi_documentareasService } from '@/generated/services/Jsi_documentareasService';
import { Jsi_assessmentsService } from '@/generated/services/Jsi_assessmentsService';
import { ASSESSMENT_TYPE, DOCUMENT_CRITICALITY, DOCUMENT_STATUS, STAGE_SCOPE } from '@/shared/constants/choices';
import type { RouteDocument, RouteStage } from '@/shared/types/onboarding';
import { addBusinessDays } from '@/shared/lib/dates';
import { ACTIVE_RECORDS, fetchAll } from './dataverse';

interface CatalogStage {
  id: string;
  name: string;
  order: number;
  isGeneral: boolean;
  businessDays: number | null;
}

interface CatalogDocument {
  stageId: string;
  document: RouteDocument;
}

/** Todos los datos necesarios para calcular la ruta de cualquier área. */
export interface OnboardingCatalog {
  stages: CatalogStage[];
  documents: CatalogDocument[];
  /** stageId → áreas a las que aplica (solo etapas específicas por área). */
  stageAreas: Map<string, Set<string>>;
  /** documentId → áreas destinatarias. Si un documento no tiene áreas, aplica a todas. */
  documentAreas: Map<string, Set<string>>;
}

function groupPairs(pairs: { key?: string; value?: string }[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const { key, value } of pairs) {
    if (!key || !value) continue;
    if (!map.has(key)) map.set(key, new Set());
    map.get(key)!.add(value);
  }
  return map;
}

/** Lee el catálogo de etapas, documentos y evaluaciones desde Dataverse. */
export async function loadOnboardingCatalog(): Promise<OnboardingCatalog> {
  const [stages, stageAreas, documents, documentAreas, assessments] = await Promise.all([
    fetchAll(
      (o) => Jsi_stagesService.getAll(o),
      { select: ['jsi_stageid', 'jsi_name', 'jsi_order', 'jsi_scope', 'jsi_businessdaysdeadline'], filter: ACTIVE_RECORDS },
      'Leer etapas',
    ),
    fetchAll(
      (o) => Jsi_stageareasService.getAll(o),
      { select: ['_jsi_stage_value', '_jsi_area_value'], filter: ACTIVE_RECORDS },
      'Leer etapas por área',
    ),
    fetchAll(
      (o) => Jsi_documentsService.getAll(o),
      {
        select: [
          'jsi_documentid',
          'jsi_code',
          'jsi_title',
          'jsi_version',
          'jsi_readingminutes',
          'jsi_criticality',
          'jsi_isdefault',
          '_jsi_stage_value',
        ],
        // Los borradores no se asignan a nadie.
        filter: `${ACTIVE_RECORDS} and jsi_status ne ${DOCUMENT_STATUS.Draft}`,
      },
      'Leer documentos',
    ),
    fetchAll(
      (o) => Jsi_documentareasService.getAll(o),
      { select: ['_jsi_document_value', '_jsi_area_value'], filter: ACTIVE_RECORDS },
      'Leer documentos por área',
    ),
    fetchAll(
      (o) => Jsi_assessmentsService.getAll(o),
      { select: ['jsi_assessmentid', '_jsi_document_value'], filter: `${ACTIVE_RECORDS} and jsi_type eq ${ASSESSMENT_TYPE.Document}` },
      'Leer evaluaciones',
    ),
  ]);

  const assessmentByDocument = new Map(
    assessments.flatMap((a) => (a._jsi_document_value ? [[a._jsi_document_value, a.jsi_assessmentid] as const] : [])),
  );

  return {
    stages: stages.map((s) => ({
      id: s.jsi_stageid,
      name: s.jsi_name ?? '',
      order: s.jsi_order,
      isGeneral: s.jsi_scope === STAGE_SCOPE.General,
      businessDays: s.jsi_businessdaysdeadline ?? null,
    })),
    documents: documents
      .filter((d) => d._jsi_stage_value)
      .map((d) => ({
        stageId: d._jsi_stage_value!,
        document: {
          id: d.jsi_documentid,
          code: d.jsi_code,
          title: d.jsi_title ?? '',
          version: d.jsi_version,
          readingMinutes: d.jsi_readingminutes ?? null,
          isCritical: d.jsi_criticality === DOCUMENT_CRITICALITY.High,
          isDefault: d.jsi_isdefault ?? true,
          assessmentId: assessmentByDocument.get(d.jsi_documentid) ?? null,
        },
      })),
    stageAreas: groupPairs(stageAreas.map((sa) => ({ key: sa._jsi_stage_value, value: sa._jsi_area_value }))),
    documentAreas: groupPairs(documentAreas.map((da) => ({ key: da._jsi_document_value, value: da._jsi_area_value }))),
  };
}

function sortStages(stages: CatalogStage[]): CatalogStage[] {
  return [...stages].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}

function documentsOfStage(catalog: OnboardingCatalog, stageId: string): RouteDocument[] {
  return catalog.documents
    .filter((item) => item.stageId === stageId)
    .map((item) => item.document)
    .sort((a, b) => a.code.localeCompare(b.code));
}

/**
 * Todas las etapas que aplican a un área, con TODOS sus documentos (función pura).
 * Es lo que ve el Admin al registrar y el Manager al validar.
 */
export function buildAreaRoute(catalog: OnboardingCatalog, areaId: string): RouteStage[] {
  const appliesToArea = (areas: Set<string> | undefined) => areas?.has(areaId) ?? false;

  return sortStages(catalog.stages)
    .filter((stage) => stage.isGeneral || appliesToArea(catalog.stageAreas.get(stage.id)))
    .map((stage) => ({
      id: stage.id,
      name: stage.name,
      order: stage.order,
      isGeneral: stage.isGeneral,
      businessDays: stage.businessDays,
      documents: documentsOfStage(catalog, stage.id).filter(
        (doc) => !catalog.documentAreas.has(doc.id) || appliesToArea(catalog.documentAreas.get(doc.id)),
      ),
    }))
    .filter((stage) => stage.documents.length > 0);
}

/** Todas las etapas con todos sus documentos, sin filtrar por área (catálogo completo del programa). */
export function buildFullCatalog(catalog: OnboardingCatalog): RouteStage[] {
  return sortStages(catalog.stages)
    .map((stage) => ({
      id: stage.id,
      name: stage.name,
      order: stage.order,
      isGeneral: stage.isGeneral,
      businessDays: stage.businessDays,
      documents: documentsOfStage(catalog, stage.id),
    }))
    .filter((stage) => stage.documents.length > 0);
}

/** Documentos que el Admin propone: todos los de las etapas generales y los "por defecto" de la Etapa 3. */
export function proposedDocumentIds(areaRoute: RouteStage[]): Set<string> {
  return new Set(
    areaRoute.flatMap((stage) => stage.documents.filter((d) => stage.isGeneral || d.isDefault).map((d) => d.id)),
  );
}

/** La ruta reducida a los documentos indicados (las etapas que quedan vacías se quitan). */
export function filterRoute(route: RouteStage[], documentIds: Set<string>): RouteStage[] {
  return route
    .map((stage) => ({ ...stage, documents: stage.documents.filter((d) => documentIds.has(d.id)) }))
    .filter((stage) => stage.documents.length > 0);
}

/**
 * Fecha de vencimiento de cada etapa de una ruta (función pura).
 * Los plazos se acumulan en orden: si la Etapa 1 tiene 5 días hábiles y la Etapa 2 otros 5,
 * la Etapa 1 vence a los 5 días hábiles del inicio y la Etapa 2 a los 10.
 * Una etapa sin plazo (businessDays = null) no tiene vencimiento.
 *
 * @returns stageId → fecha "AAAA-MM-DD" o null.
 */
export function computeStageDueDates(stages: RouteStage[], startDate: string): Map<string, string | null> {
  const dueDates = new Map<string, string | null>();
  let accumulated = 0;
  for (const stage of [...stages].sort((a, b) => a.order - b.order)) {
    if (stage.businessDays === null) {
      dueDates.set(stage.id, null);
      continue;
    }
    accumulated += stage.businessDays;
    dueDates.set(stage.id, addBusinessDays(startDate, accumulated));
  }
  return dueDates;
}
