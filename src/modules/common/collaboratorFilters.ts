import { COLLABORATOR_STATUS } from '@/shared/constants/collaboratorStatus';
import { downloadCsv } from '@/shared/lib/csv';
import { formatDate, todayIso } from '@/shared/lib/dates';
import { normalizeText as normalize } from '@/shared/lib/format';
import type { Collaborator, CollaboratorStatus } from '@/shared/types/onboarding';

export interface CollaboratorFilters {
  search: string;
  areaId: string;
  status: CollaboratorStatus | '';
}

export const EMPTY_FILTERS: CollaboratorFilters = { search: '', areaId: '', status: '' };

export function filterCollaborators(collaborators: Collaborator[], filters: CollaboratorFilters): Collaborator[] {
  const search = normalize(filters.search.trim());

  return collaborators.filter(
    (c) =>
      (!search || normalize(`${c.fullName} ${c.jobTitle}`).includes(search)) &&
      (!filters.areaId || c.areaId === filters.areaId) &&
      (!filters.status || c.status === filters.status),
  );
}

/** Descarga la lista como CSV (con lo que se ve en pantalla, ya filtrado). */
export function exportCollaboratorsCsv(collaborators: Collaborator[]): void {
  downloadCsv(
    `colaboradores-${todayIso()}.csv`,
    ['Colaborador', 'Correo', 'Área', 'Cargo', 'Manager', 'Ingreso', 'Documentos aprobados', 'Documentos asignados', 'Promedio', 'Estado'],
    collaborators.map((c) => [
      c.fullName,
      c.email,
      c.areaName,
      c.jobTitle,
      c.managerName,
      formatDate(c.hireDate),
      c.documentsApproved,
      c.documentsTotal,
      c.averageScore === null ? '' : `${c.averageScore}%`,
      COLLABORATOR_STATUS[c.status].label,
    ]),
  );
}
