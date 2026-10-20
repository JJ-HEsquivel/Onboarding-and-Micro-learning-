/**
 * Versiones de los documentos (jsi_documentversion) y el efecto de publicar una nueva.
 *
 * Al publicar una versión:
 * - Se registra en el historial y el documento pasa a "Actualizado" con la nueva versión.
 * - Se avisa (jsi_notification) a todas las personas que lo tienen en su ruta validada.
 * - Si el cambio es MAYOR, quienes todavía están en inducción y ya lo habían leído deben
 *   volver a leerlo: su lectura vuelve a "Pendiente" y su examen se reinicia.
 *   Las inducciones ya completadas no se reabren: el refuerzo para ellas es parte del
 *   micro aprendizaje (fase 5).
 */
import { Jsi_documentversionsService } from '@/generated/services/Jsi_documentversionsService';
import { Jsi_documentsService } from '@/generated/services/Jsi_documentsService';
import { Jsi_documentassignmentsService } from '@/generated/services/Jsi_documentassignmentsService';
import { Jsi_assessmentassignmentsService } from '@/generated/services/Jsi_assessmentassignmentsService';
import { Jsi_onboardingsService } from '@/generated/services/Jsi_onboardingsService';
import { ASSIGNMENT_STATUS, CHANGE_LEVEL, DOCUMENT_STATUS, EXAM_STATUS, PROGRESS_STATUS, VALIDATION_STATUS } from '@/shared/constants/choices';
import { PROGRAM_RULES } from '@/shared/constants/program';
import type { ChangeLevel } from '@/shared/domain/documentVersion';
import { addCalendarDays, todayIso } from '@/shared/lib/dates';
import type { DocumentVersionEntry, ManagedDocument } from '@/shared/types/content';
import { ACTIVE_RECORDS, bind, fetchAll, unwrap } from './dataverse';
import { notify } from './notification.service';
import { saveOnboardingProgress } from './route.service';

type NewVersionRecord = Parameters<typeof Jsi_documentversionsService.create>[0];
type DocumentChanges = Parameters<typeof Jsi_documentsService.update>[1];
type AssignmentChanges = Parameters<typeof Jsi_documentassignmentsService.update>[1];
type ExamChanges = Parameters<typeof Jsi_assessmentassignmentsService.update>[1];

export const INITIAL_VERSION = '1.0';

const LEVEL_VALUE: Record<ChangeLevel, number> = { major: CHANGE_LEVEL.Major, minor: CHANGE_LEVEL.Minor };

/** Registra una versión en el historial del documento. */
export async function recordVersion(entry: {
  documentId: string;
  code: string;
  version: string;
  level: ChangeLevel;
  details: string;
}): Promise<void> {
  const record = {
    'jsi_Document@odata.bind': bind('jsi_documents', entry.documentId),
    jsi_name: `${entry.code} v${entry.version}`.slice(0, 50),
    jsi_version: entry.version,
    jsi_changelevel: LEVEL_VALUE[entry.level],
    jsi_changedetails: entry.details.trim(),
    jsi_releasedate: todayIso(),
  } as NewVersionRecord;
  unwrap(await Jsi_documentversionsService.create(record), 'Registrar versión');
}

/** Historial de versiones de un documento, de la más reciente a la más antigua. */
export async function listVersions(documentId: string): Promise<DocumentVersionEntry[]> {
  const rows = await fetchAll(
    (o) => Jsi_documentversionsService.getAll(o),
    {
      select: ['jsi_documentversionid', 'jsi_version', 'jsi_changelevel', 'jsi_releasedate', 'jsi_changedetails'],
      filter: `${ACTIVE_RECORDS} and _jsi_document_value eq ${documentId}`,
      orderBy: ['createdon desc'],
    },
    'Leer versiones',
  );
  return rows.map((row) => ({
    id: row.jsi_documentversionid,
    version: row.jsi_version,
    level: row.jsi_changelevel === CHANGE_LEVEL.Minor ? 'minor' : 'major',
    releaseDate: row.jsi_releasedate?.slice(0, 10) ?? null,
    details: row.jsi_changedetails ?? '',
  }));
}

/** Una persona que tiene el documento en su ruta. */
interface AudienceEntry {
  assignmentId: string;
  onboardingId: string;
  personId: string;
  isRead: boolean;
  /** Su Manager ya validó la ruta (el documento es visible para la persona). */
  isVisible: boolean;
  /** Su inducción sigue en curso (validada y no completada). */
  inProgress: boolean;
}

async function loadAudience(documentId: string): Promise<AudienceEntry[]> {
  const [assignments, onboardings] = await Promise.all([
    fetchAll(
      (o) => Jsi_documentassignmentsService.getAll(o),
      {
        select: ['jsi_documentassignmentid', '_jsi_onboarding_value', '_jsi_employee_value', 'jsi_status'],
        filter: `${ACTIVE_RECORDS} and _jsi_document_value eq ${documentId}`,
      },
      'Leer quiénes tienen el documento',
    ),
    fetchAll(
      (o) => Jsi_onboardingsService.getAll(o),
      { select: ['jsi_onboardingid', 'jsi_validationstatus', 'jsi_progressstatus'], filter: ACTIVE_RECORDS },
      'Leer inducciones',
    ),
  ]);
  const onboardingById = new Map(onboardings.map((o) => [o.jsi_onboardingid, o]));

  return assignments.flatMap((a) => {
    const onboarding = a._jsi_onboarding_value ? onboardingById.get(a._jsi_onboarding_value) : undefined;
    if (!onboarding || !a._jsi_employee_value) return [];
    const isVisible = onboarding.jsi_validationstatus === VALIDATION_STATUS.Validated;
    return [
      {
        assignmentId: a.jsi_documentassignmentid,
        onboardingId: onboarding.jsi_onboardingid,
        personId: a._jsi_employee_value,
        isRead: a.jsi_status === ASSIGNMENT_STATUS.Read,
        isVisible,
        inProgress: isVisible && onboarding.jsi_progressstatus !== PROGRESS_STATUS.Completed,
      },
    ];
  });
}

export interface VersionImpact {
  /** Personas a las que se les avisa (tienen el documento en su ruta validada). */
  notified: number;
  /** Personas que deberán volver a leerlo si el cambio es mayor. */
  toReread: number;
}

/** A quiénes afectaría publicar una versión nueva (para mostrarlo antes de confirmar). */
export async function getVersionImpact(documentId: string): Promise<VersionImpact> {
  const audience = await loadAudience(documentId);
  return {
    notified: new Set(audience.filter((e) => e.isVisible).map((e) => e.personId)).size,
    toReread: new Set(audience.filter((e) => e.inProgress && e.isRead).map((e) => e.personId)).size,
  };
}

/** La lectura vuelve a "Pendiente" (con un plazo nuevo) y el examen se reinicia. */
async function requireRereading(entry: AudienceEntry, assessmentId: string | null): Promise<void> {
  const assignmentChanges = {
    jsi_status: ASSIGNMENT_STATUS.Pending,
    jsi_confirmedon: null,
    jsi_duedate: addCalendarDays(todayIso(), PROGRAM_RULES.extraDocumentDueDays),
  } as unknown as AssignmentChanges;
  unwrap(await Jsi_documentassignmentsService.update(entry.assignmentId, assignmentChanges), 'Reiniciar lectura');

  if (!assessmentId) return;
  const exams = await fetchAll(
    (o) => Jsi_assessmentassignmentsService.getAll(o),
    {
      select: ['jsi_assessmentassignmentid'],
      filter: `${ACTIVE_RECORDS} and _jsi_onboarding_value eq ${entry.onboardingId} and _jsi_assessment_value eq ${assessmentId}`,
    },
    'Leer examen asignado',
  );
  const examChanges = {
    jsi_status: EXAM_STATUS.Locked,
    jsi_score: null,
    jsi_attemptsused: 0,
    jsi_duedate: null,
    jsi_resolvedon: null,
  } as unknown as ExamChanges;
  await Promise.all(
    exams.map(async (exam) =>
      unwrap(await Jsi_assessmentassignmentsService.update(exam.jsi_assessmentassignmentid, examChanges), 'Reiniciar examen'),
    ),
  );
}

export interface NewVersionInput {
  document: ManagedDocument;
  version: string;
  level: ChangeLevel;
  details: string;
  /** Contenido nuevo del lector, o null para conservar el actual. */
  content: string | null;
}

export interface PublishResult {
  notified: number;
  reread: number;
}

export async function publishVersion(input: NewVersionInput): Promise<PublishResult> {
  const { document, version, level } = input;

  await recordVersion({ documentId: document.id, code: document.code, version, level, details: input.details });

  const changes = {
    jsi_version: version,
    jsi_updatedon: todayIso(),
    // Un borrador sigue siendo borrador; uno publicado pasa a "Actualizado".
    jsi_status: document.status === 'draft' ? DOCUMENT_STATUS.Draft : DOCUMENT_STATUS.Updated,
    ...(input.content !== null ? { jsi_content: input.content.trim() } : {}),
  } as DocumentChanges;
  unwrap(await Jsi_documentsService.update(document.id, changes), 'Actualizar versión del documento');

  const audience = await loadAudience(document.id);
  const toReread = level === 'major' ? audience.filter((e) => e.inProgress && e.isRead) : [];

  await Promise.all(toReread.map((entry) => requireRereading(entry, document.assessmentId)));
  // El avance de esas inducciones cambió (un documento dejó de estar aprobado).
  await Promise.all([...new Set(toReread.map((e) => e.onboardingId))].map((id) => saveOnboardingProgress(id)));

  const rereadPeople = new Set(toReread.map((e) => e.personId));
  const notifiedPeople = [...new Set(audience.filter((e) => e.isVisible).map((e) => e.personId))];
  await Promise.all(
    notifiedPeople.map((personId) =>
      notify({
        personId,
        type: 'DocumentUpdate',
        title: `Nueva versión: ${document.title}`,
        details: rereadPeople.has(personId)
          ? `«${document.title}» pasó a la versión ${version}. Vuelva a leerlo y rinda su evaluación. Cambios: ${input.details.trim()}`
          : `«${document.title}» pasó a la versión ${version}. Cambios: ${input.details.trim()}`,
      }),
    ),
  );

  return { notified: notifiedPeople.length, reread: rereadPeople.size };
}
