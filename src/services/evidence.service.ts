/**
 * Evidencias de cumplimiento (jsi_evidence): el registro trazable de cada lectura
 * confirmada, cada examen rendido y cada cambio de rol, para auditorías.
 */
import { Jsi_evidencesService } from '@/generated/services/Jsi_evidencesService';
import { EVIDENCE_TYPE } from '@/shared/constants/choices';
import { ACTIVE_RECORDS, bind, fetchAll, unwrap } from './dataverse';

type NewEvidenceRecord = Parameters<typeof Jsi_evidencesService.create>[0];

export type EvidenceType = keyof typeof EVIDENCE_TYPE;

export interface NewEvidence {
  personId: string;
  type: EvidenceType;
  documentId?: string;
  assessmentId?: string;
  version?: string;
  /** Resultado corto: "Confirmada", "85%", "Aprobado por Marcelo Antezana"… */
  result: string;
  description: string;
}

export interface Evidence {
  id: string;
  type: EvidenceType | null;
  result: string;
  description: string;
  version: string;
  /** Fecha y hora ISO. */
  date: string | null;
  hash: string;
}

/** Huella corta para identificar la evidencia (no es una firma criptográfica). */
function evidenceHash(): string {
  const part = () => Math.random().toString(16).slice(2, 10);
  return `${part()}${part()}`;
}

export async function recordEvidence(evidence: NewEvidence): Promise<void> {
  const record = {
    'jsi_Employee@odata.bind': bind('jsi_persons', evidence.personId),
    ...(evidence.documentId ? { 'jsi_Document@odata.bind': bind('jsi_documents', evidence.documentId) } : {}),
    ...(evidence.assessmentId ? { 'jsi_Assessment@odata.bind': bind('jsi_assessments', evidence.assessmentId) } : {}),
    jsi_type: EVIDENCE_TYPE[evidence.type],
    jsi_version: evidence.version,
    jsi_result: evidence.result.slice(0, 100),
    jsi_description: evidence.description.slice(0, 300),
    jsi_date: new Date().toISOString(),
    jsi_hash: evidenceHash(),
  } as NewEvidenceRecord;
  unwrap(await Jsi_evidencesService.create(record), 'Registrar evidencia');
}

/** Fecha ("AAAA-MM-DD") de la evidencia más reciente de cada persona: su última actividad. */
export async function lastActivityByPerson(): Promise<Map<string, string>> {
  const rows = await fetchAll(
    (o) => Jsi_evidencesService.getAll(o),
    { select: ['_jsi_employee_value', 'jsi_date'], filter: `${ACTIVE_RECORDS} and jsi_date ne null` },
    'Leer actividad',
  );
  const latest = new Map<string, string>();
  for (const row of rows) {
    const personId = row._jsi_employee_value;
    const date = row.jsi_date?.slice(0, 10);
    if (personId && date && date > (latest.get(personId) ?? '')) latest.set(personId, date);
  }
  return latest;
}

const TYPE_BY_VALUE = new Map(Object.entries(EVIDENCE_TYPE).map(([key, value]) => [value as number, key as EvidenceType]));

/** Evidencias de una persona, de la más reciente a la más antigua. */
export async function listEvidence(personId: string): Promise<Evidence[]> {
  const rows = await fetchAll(
    (o) => Jsi_evidencesService.getAll(o),
    {
      select: ['jsi_evidenceid', 'jsi_type', 'jsi_result', 'jsi_description', 'jsi_version', 'jsi_date', 'jsi_hash'],
      filter: `${ACTIVE_RECORDS} and _jsi_employee_value eq ${personId}`,
      orderBy: ['jsi_date desc'],
    },
    'Leer evidencias',
  );
  return rows.map((row) => ({
    id: row.jsi_evidenceid,
    type: TYPE_BY_VALUE.get(row.jsi_type) ?? null,
    result: row.jsi_result ?? '',
    description: row.jsi_description ?? '',
    version: row.jsi_version ?? '',
    date: row.jsi_date ?? null,
    hash: row.jsi_hash ?? '',
  }));
}
