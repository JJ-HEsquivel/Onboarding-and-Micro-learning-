import { Download, Search } from 'lucide-react';
import { Button } from '@/shared/components/Button';
import { COLLABORATOR_STATUS } from '@/shared/constants/collaboratorStatus';
import { pluralize } from '@/shared/lib/format';
import type { Area, CollaboratorStatus } from '@/shared/types/onboarding';
import type { CollaboratorFilters } from '../collaboratorFilters';

interface CollaboratorsToolbarProps {
  filters: CollaboratorFilters;
  areas: Area[];
  resultCount: number;
  onChange: (filters: CollaboratorFilters) => void;
  onExport: () => void;
}

const STATUS_OPTIONS = Object.entries(COLLABORATOR_STATUS) as [CollaboratorStatus, { label: string }][];

/** Buscador, filtros por área y estado, contador de resultados y exportación. */
export function CollaboratorsToolbar({ filters, areas, resultCount, onChange, onExport }: CollaboratorsToolbarProps) {
  return (
    <div className="collaborators-toolbar">
      <label className="collaborators-toolbar__search">
        <Search size={16} />
        <input
          type="search"
          className="input"
          placeholder="Buscar por nombre o cargo"
          aria-label="Buscar por nombre o cargo"
          value={filters.search}
          onChange={(event) => onChange({ ...filters, search: event.target.value })}
        />
      </label>

      <select
        className="input collaborators-toolbar__select"
        aria-label="Filtrar por área"
        value={filters.areaId}
        onChange={(event) => onChange({ ...filters, areaId: event.target.value })}
      >
        <option value="">Todas las áreas</option>
        {areas.map((area) => (
          <option key={area.id} value={area.id}>
            {area.name}
          </option>
        ))}
      </select>

      <select
        className="input collaborators-toolbar__select"
        aria-label="Filtrar por estado"
        value={filters.status}
        onChange={(event) => onChange({ ...filters, status: event.target.value as CollaboratorFilters['status'] })}
      >
        <option value="">Todos los estados</option>
        {STATUS_OPTIONS.map(([value, { label }]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      <div className="collaborators-toolbar__end">
        <span className="collaborators-toolbar__count">{pluralize(resultCount, 'resultado', 'resultados')}</span>
        <Button variant="secondary" onClick={onExport} disabled={resultCount === 0}>
          <Download size={16} />
          CSV
        </Button>
      </div>
    </div>
  );
}
