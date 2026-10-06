/**
 * Ruta de inducción: qué etapas y documentos le corresponden a un área.
 * Fuente: jsi_stage, jsi_stagearea, jsi_document y jsi_documentarea.
 */
import { Jsi_stagesService } from '@/generated/services/Jsi_stagesService';
import { Jsi_stageareasService } from '@/generated/services/Jsi_stageareasService';
import { Jsi_documentsService } from '@/generated/services/Jsi_documentsService';
import { Jsi_documentareasService } from '@/generated/services/Jsi_documentareasService';
import { DOCUMENT_CRITICALITY, DOCUMENT_STATUS, STAGE_SCOPE } from '@/shared/constants/choices';
import type { RouteDocument, RouteStage } from '@/shared/types/onboarding';
import { ACTIVE_RECORDS, fetchAll } from './dataverse';

interface CatalogStage {
  id: string;
  name: string;
  order: number;
  isGeneral: boolean;
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

/** Lee el catálogo de etapas y documentos desde Dataverse. */
export async function loadOnboardingCatalog(): Promise<OnboardingCatalog> {
  const [stages, stageAreas, documents, documentAreas] = await Promise.all([
    fetchAll(
      (o) => Jsi_stagesService.getAll(o),
      { select: ['jsi_stageid', 'jsi_name', 'jsi_order', 'jsi_scope'], filter: ACTIVE_RECORDS },
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
        select: ['jsi_documentid', 'jsi_code', 'jsi_title', 'jsi_version', 'jsi_readingminutes', 'jsi_criticality', '_jsi_stage_value'],
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
  ]);

  return {
    stages: stages.map((s) => ({
      id: s.jsi_stageid,
      name: s.jsi_name ?? '',
      order: s.jsi_order,
      isGeneral: s.jsi_scope === STAGE_SCOPE.General,
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
        },
      })),
    stageAreas: groupPairs(stageAreas.map((sa) => ({ key: sa._jsi_stage_value, value: sa._jsi_area_value }))),
    documentAreas: groupPairs(documentAreas.map((da) => ({ key: da._jsi_document_value, value: da._jsi_area_value }))),
  };
}

/**
 * Calcula la ruta propuesta para un área (función pura, sin acceso a Dataverse).
 *
 * Reglas:
 * - Una etapa "General" aplica a todas las áreas.
 * - Una etapa "AreaSpecific" aplica solo a las áreas vinculadas en jsi_stagearea.
 * - Un documento aplica si su etapa aplica y, cuando tiene áreas en jsi_documentarea,
 *   si el área está entre ellas.
 * - Las etapas sin documentos no se muestran.
 */
export function buildProposedRoute(catalog: OnboardingCatalog, areaId: string): RouteStage[] {
  const appliesToArea = (areas: Set<string> | undefined) => areas?.has(areaId) ?? false;

  return catalog.stages
    .filter((stage) => stage.isGeneral || appliesToArea(catalog.stageAreas.get(stage.id)))
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
    .map((stage) => ({
      id: stage.id,
      name: stage.name,
      order: stage.order,
      documents: catalog.documents
        .filter((item) => item.stageId === stage.id)
        .map((item) => item.document)
        .filter((doc) => !catalog.documentAreas.has(doc.id) || appliesToArea(catalog.documentAreas.get(doc.id)))
        .sort((a, b) => a.code.localeCompare(b.code)),
    }))
    .filter((stage) => stage.documents.length > 0);
}
