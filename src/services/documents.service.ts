/**
 * Detalle de un documento (jsi_document) para el lector.
 */
import { Jsi_documentsService } from '@/generated/services/Jsi_documentsService';
import { DOCUMENT_CRITICALITY } from '@/shared/constants/choices';
import { unwrap } from './dataverse';

export interface DocumentSection {
  title: string;
  body: string;
}

export interface DocumentDetail {
  id: string;
  code: string;
  title: string;
  version: string;
  /** "AAAA-MM-DD" */
  updatedOn: string | null;
  readingMinutes: number | null;
  pages: number | null;
  owner: string;
  criticality: 'high' | 'medium' | 'low';
  summary: string;
  sections: DocumentSection[];
}

/**
 * Convierte el contenido guardado ("## Título" + párrafo, separados por líneas en blanco)
 * en secciones. El texto antes del primer título queda como una sección sin título.
 */
export function parseContent(content: string): DocumentSection[] {
  const sections: DocumentSection[] = [];
  let current: DocumentSection | null = null;
  for (const line of content.split(/\r?\n/)) {
    if (line.startsWith('## ')) {
      current = { title: line.slice(3).trim(), body: '' };
      sections.push(current);
    } else if (line.trim()) {
      if (!current) {
        current = { title: '', body: '' };
        sections.push(current);
      }
      current.body = current.body ? `${current.body}\n${line.trim()}` : line.trim();
    }
  }
  return sections;
}

export async function getDocumentDetail(documentId: string): Promise<DocumentDetail> {
  const d = unwrap(
    await Jsi_documentsService.get(documentId, {
      select: [
        'jsi_documentid',
        'jsi_code',
        'jsi_title',
        'jsi_version',
        'jsi_updatedon',
        'jsi_readingminutes',
        'jsi_pagecount',
        'jsi_owningdepartment',
        'jsi_criticality',
        'jsi_summary',
        'jsi_content',
      ],
    }),
    'Leer documento',
  );

  return {
    id: d.jsi_documentid,
    code: d.jsi_code,
    title: d.jsi_title ?? '',
    version: d.jsi_version,
    updatedOn: d.jsi_updatedon?.slice(0, 10) ?? null,
    readingMinutes: d.jsi_readingminutes ?? null,
    pages: d.jsi_pagecount ?? null,
    owner: d.jsi_owningdepartment ?? '',
    criticality:
      d.jsi_criticality === DOCUMENT_CRITICALITY.High ? 'high' : d.jsi_criticality === DOCUMENT_CRITICALITY.Low ? 'low' : 'medium',
    summary: d.jsi_summary ?? '',
    sections: parseContent(d.jsi_content ?? ''),
  };
}
