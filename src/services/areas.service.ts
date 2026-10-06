import { Jsi_areasService } from '@/generated/services/Jsi_areasService';
import type { Area } from '@/shared/types/onboarding';
import { ACTIVE_RECORDS, fetchAll } from './dataverse';

/** Áreas activas ordenadas por nombre. */
export async function listAreas(): Promise<Area[]> {
  const rows = await fetchAll(
    (o) => Jsi_areasService.getAll(o),
    { select: ['jsi_areaid', 'jsi_name', 'jsi_code'], filter: ACTIVE_RECORDS, orderBy: ['jsi_name asc'] },
    'Leer áreas',
  );

  return rows.map((row) => ({ id: row.jsi_areaid, name: row.jsi_name ?? '', code: row.jsi_code }));
}
