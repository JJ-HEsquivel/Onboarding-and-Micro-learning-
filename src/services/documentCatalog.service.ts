/**
 * Gestión del catálogo de documentos por parte del Administrador: alta, edición,
 * áreas destinatarias (jsi_documentarea) y propuesta por defecto en la Etapa 3.
 *
 * El lector del colaborador usa documents.service.ts; las versiones nuevas,
 * documentVersion.service.ts.
 */
import { Jsi_documentsService } from '@/generated/services/Jsi_documentsService';
import { Jsi_documentareasService } from '@/generated/services/Jsi_documentareasService';
import { Jsi_documentcategoriesService } from '@/generated/services/Jsi_documentcategoriesService';
import { Jsi_assessmentsService } from '@/generated/services/Jsi_assessmentsService';
import { Jsi_questionsService } from '@/generated/services/Jsi_questionsService';
import { ASSESSMENT_TYPE, DOCUMENT_CRITICALITY, DOCUMENT_STATUS } from '@/shared/constants/choices';
import { diffSets } from '@/shared/lib/collections';
import { todayIso } from '@/shared/lib/dates';
import type { Criticality, DocumentCategory, DocumentInput, DocumentStatus, ManagedDocument } from '@/shared/types/content';
import { ACTIVE_RECORDS, bind, fetchAll, odataString, unwrap } from './dataverse';
import { INITIAL_VERSION, recordVersion } from './documentVersion.service';

type NewDocumentRecord = Parameters<typeof Jsi_documentsService.create>[0];
type DocumentChanges = Parameters<typeof Jsi_documentsService.update>[1];
type AssessmentChanges = Parameters<typeof Jsi_assessmentsService.update>[1];
type NewDocumentAreaRecord = Parameters<typeof Jsi_documentareasService.create>[0];

export const CRITICALITY_VALUE: Record<Criticality, number> = {
  high: DOCUMENT_CRITICALITY.High,
  medium: DOCUMENT_CRITICALITY.Medium,
  low: DOCUMENT_CRITICALITY.Low,
};

const CRITICALITY_BY_VALUE = new Map(Object.entries(CRITICALITY_VALUE).map(([key, value]) => [value, key as Criticality]));

const STATUS_BY_VALUE = new Map<number, DocumentStatus>([
  [DOCUMENT_STATUS.Current, 'current'],
  [DOCUMENT_STATUS.Updated, 'updated'],
  [DOCUMENT_STATUS.Draft, 'draft'],
]);

/** Agrupa pares (clave, valor) en clave → lista de valores. */
function groupBy(pairs: [string | undefined, string | undefined][]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const [key, value] of pairs) {
    if (!key || !value) continue;
    map.set(key, [...(map.get(key) ?? []), value]);
  }
  return map;
}

export async function listCategories(): Promise<DocumentCategory[]> {
  const rows = await fetchAll(
    (o) => Jsi_documentcategoriesService.getAll(o),
    { select: ['jsi_documentcategoryid', 'jsi_name'], filter: ACTIVE_RECORDS, orderBy: ['jsi_name asc'] },
    'Leer categorías',
  );
  return rows.map((row) => ({ id: row.jsi_documentcategoryid, name: row.jsi_name ?? '' }));
}

/** Todos los documentos (incluidos los borradores), ordenados por código. */
export async function listManagedDocuments(): Promise<ManagedDocument[]> {
  const [documents, documentAreas, assessments, questions] = await Promise.all([
    fetchAll(
      (o) => Jsi_documentsService.getAll(o),
      {
        select: [
          'jsi_documentid',
          'jsi_code',
          'jsi_title',
          'jsi_version',
          'jsi_status',
          '_jsi_stage_value',
          '_jsi_category_value',
          'jsi_criticality',
          'jsi_isdefault',
          'jsi_readingminutes',
          'jsi_pagecount',
          'jsi_owningdepartment',
          'jsi_summary',
          'jsi_updatedon',
        ],
        filter: ACTIVE_RECORDS,
        orderBy: ['jsi_code asc'],
      },
      'Leer documentos',
    ),
    fetchAll(
      (o) => Jsi_documentareasService.getAll(o),
      { select: ['_jsi_document_value', '_jsi_area_value'], filter: ACTIVE_RECORDS },
      'Leer áreas de los documentos',
    ),
    fetchAll(
      (o) => Jsi_assessmentsService.getAll(o),
      { select: ['jsi_assessmentid', '_jsi_document_value'], filter: `${ACTIVE_RECORDS} and jsi_type eq ${ASSESSMENT_TYPE.Document}` },
      'Leer evaluaciones',
    ),
    fetchAll(
      (o) => Jsi_questionsService.getAll(o),
      { select: ['_jsi_assessment_value'], filter: `${ACTIVE_RECORDS} and jsi_active eq true` },
      'Leer preguntas',
    ),
  ]);

  const areasByDocument = groupBy(documentAreas.map((da) => [da._jsi_document_value, da._jsi_area_value]));
  const assessmentByDocument = new Map(
    assessments.flatMap((a) => (a._jsi_document_value ? [[a._jsi_document_value, a.jsi_assessmentid] as const] : [])),
  );
  const questionCount = new Map<string, number>();
  for (const q of questions) {
    if (q._jsi_assessment_value) questionCount.set(q._jsi_assessment_value, (questionCount.get(q._jsi_assessment_value) ?? 0) + 1);
  }

  return documents.map((d) => {
    const assessmentId = assessmentByDocument.get(d.jsi_documentid) ?? null;
    return {
      id: d.jsi_documentid,
      code: d.jsi_code,
      title: d.jsi_title ?? '',
      version: d.jsi_version,
      status: STATUS_BY_VALUE.get(d.jsi_status) ?? 'current',
      stageId: d._jsi_stage_value ?? null,
      categoryId: d._jsi_category_value ?? null,
      criticality: CRITICALITY_BY_VALUE.get(d.jsi_criticality) ?? 'medium',
      isDefault: d.jsi_isdefault ?? true,
      readingMinutes: d.jsi_readingminutes ?? null,
      pages: d.jsi_pagecount ?? null,
      owner: d.jsi_owningdepartment ?? '',
      summary: d.jsi_summary ?? '',
      updatedOn: d.jsi_updatedon?.slice(0, 10) ?? null,
      areaIds: areasByDocument.get(d.jsi_documentid) ?? [],
      assessmentId,
      questionCount: assessmentId ? (questionCount.get(assessmentId) ?? 0) : 0,
    };
  });
}

/** Texto completo del documento (no se lee en el listado porque puede ser largo). */
export async function getDocumentContent(documentId: string): Promise<string> {
  const row = unwrap(await Jsi_documentsService.get(documentId, { select: ['jsi_content'] }), 'Leer contenido del documento');
  return row.jsi_content ?? '';
}

/** true si otro documento activo ya usa ese código. */
export async function isCodeTaken(code: string, exceptDocumentId?: string): Promise<boolean> {
  const rows = unwrap(
    await Jsi_documentsService.getAll({
      select: ['jsi_documentid'],
      filter: `${ACTIVE_RECORDS} and jsi_code eq ${odataString(code.trim())}`,
      top: 2,
    }),
    'Verificar código',
  );
  return rows.some((row) => row.jsi_documentid !== exceptDocumentId);
}

/** Columnas comunes al crear y al editar. */
function documentFields(input: DocumentInput) {
  return {
    jsi_code: input.code.trim(),
    jsi_title: input.title.trim(),
    'jsi_Stage@odata.bind': bind('jsi_stages', input.stageId),
    ...(input.categoryId ? { 'jsi_Category@odata.bind': bind('jsi_documentcategories', input.categoryId) } : {}),
    jsi_criticality: CRITICALITY_VALUE[input.criticality],
    jsi_isdefault: input.isDefault,
    jsi_readingminutes: input.readingMinutes,
    jsi_pagecount: input.pages,
    jsi_owningdepartment: input.owner.trim(),
    jsi_summary: input.summary.trim(),
    jsi_content: input.content.trim(),
  };
}

/** Deja en jsi_documentarea exactamente las áreas indicadas para el documento. */
async function syncDocumentAreas(documentId: string, areaIds: string[]): Promise<void> {
  const rows = await fetchAll(
    (o) => Jsi_documentareasService.getAll(o),
    { select: ['jsi_documentareaid', '_jsi_area_value'], filter: `${ACTIVE_RECORDS} and _jsi_document_value eq ${documentId}` },
    'Leer áreas del documento',
  );
  const rowByArea = new Map(rows.flatMap((r) => (r._jsi_area_value ? [[r._jsi_area_value, r.jsi_documentareaid] as const] : [])));
  const { toAdd, toRemove } = diffSets(new Set(rowByArea.keys()), new Set(areaIds));

  await Promise.all([
    ...toAdd.map(async (areaId) => {
      const record = {
        'jsi_Document@odata.bind': bind('jsi_documents', documentId),
        'jsi_Area@odata.bind': bind('jsi_areas', areaId),
      } as NewDocumentAreaRecord;
      unwrap(await Jsi_documentareasService.create(record), 'Asignar área al documento');
    }),
    ...toRemove.map((areaId) => Jsi_documentareasService.delete(rowByArea.get(areaId)!)),
  ]);
}

/** Crea un documento en su versión inicial (1.0) y registra esa versión en el historial. */
export async function createDocument(input: DocumentInput): Promise<string> {
  const today = todayIso();
  const record = {
    ...documentFields(input),
    jsi_version: INITIAL_VERSION,
    jsi_status: input.isDraft ? DOCUMENT_STATUS.Draft : DOCUMENT_STATUS.Current,
    jsi_mandatory: true,
    jsi_updatedon: today,
  } as NewDocumentRecord;
  const documentId = unwrap(await Jsi_documentsService.create(record), 'Crear documento').jsi_documentid;

  await Promise.all([
    syncDocumentAreas(documentId, input.areaIds),
    recordVersion({ documentId, code: input.code.trim(), version: INITIAL_VERSION, level: 'major', details: 'Versión inicial.' }),
  ]);
  return documentId;
}

/**
 * Actualiza los datos de un documento (no su versión: para eso está «Nueva versión»).
 * Si cambia el título o la etapa, también se actualiza su evaluación.
 */
export async function updateDocument(previous: ManagedDocument, input: DocumentInput): Promise<void> {
  // Publicar un borrador lo deja "Vigente"; un documento ya publicado conserva su estado.
  const status = input.isDraft
    ? DOCUMENT_STATUS.Draft
    : previous.status === 'updated'
      ? DOCUMENT_STATUS.Updated
      : DOCUMENT_STATUS.Current;
  const changes = { ...documentFields(input), jsi_status: status } as DocumentChanges;
  unwrap(await Jsi_documentsService.update(previous.id, changes), 'Actualizar documento');

  const tasks: Promise<unknown>[] = [syncDocumentAreas(previous.id, input.areaIds)];
  if (previous.assessmentId && (previous.title !== input.title.trim() || previous.stageId !== input.stageId)) {
    const assessmentChanges = {
      jsi_title: `Evaluación · ${input.title.trim()}`,
      'jsi_Stage@odata.bind': bind('jsi_stages', input.stageId),
    } as AssessmentChanges;
    tasks.push(Jsi_assessmentsService.update(previous.assessmentId, assessmentChanges).then((r) => unwrap(r, 'Actualizar evaluación')));
  }
  await Promise.all(tasks);
}

/** Marca si un documento de una etapa por área se propone por defecto al registrar a alguien. */
export async function setDocumentDefault(documentId: string, isDefault: boolean): Promise<void> {
  unwrap(await Jsi_documentsService.update(documentId, { jsi_isdefault: isDefault }), 'Actualizar propuesta por defecto');
}
