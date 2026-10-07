import { COLLABORATOR_STATUS } from '@/shared/constants/collaboratorStatus';
import { downloadCsv } from '@/shared/lib/csv';
import { formatDate, todayIso } from '@/shared/lib/dates';
import type { Collaborator, CollaboratorStatus } from '@/shared/types/onboarding';

export interface CollaboratorFilters {
  search: string;
  areaId: string;
  status: CollaboratorStatus | '';
}

export const EMPTY_FILTERS: CollaboratorFilters = { search: '', areaId: '', status: '' };

/** Minúsculas y sin tildes, para que "jose" encuentre a "José". */
function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

export function filterCollaborators(collaborators: Collaborator[], filters: CollaboratorFilters): Collaborator[] {
  const search = normalize(filters.search.trim());

  return collaborators.filter(
    (c) =>
      (!search || normalize(`${c.fullName} ${c.jobTitle}`).includes(search)) &&
      (!filters.areaId || c.areaId === filters.areaId) &&
      (!filters.status || c.status === filters.status),
  );
}

export function exportCollaboratorsCsv(collaborators: Collaborator[]): void {
  downloadCsv(
    `colaboradores-${todayIso()}.csv`,
    ['Colaborador', 'Área', 'Cargo', 'Manager', 'Ingreso', 'Documentos leídos', 'Documentos asignados', 'Estado'],
    collaborators.map((c) => [
      c.fullName,
      c.areaName,
      c.jobTitle,
      c.managerName,
      formatDate(c.hireDate),
      c.documentsRead,
      c.documentsTotal,
      COLLABORATOR_STATUS[c.status].label,
    ]),
  );
}
