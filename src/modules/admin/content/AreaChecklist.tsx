import type { Area } from '@/shared/types/onboarding';

interface AreaChecklistProps {
  /** Prefijo de los id de las casillas (debe ser único en la pantalla). */
  idPrefix: string;
  areas: Area[];
  selected: string[];
  onChange: (areaIds: string[]) => void;
  disabled?: boolean;
}

/** Casillas para elegir varias áreas (ej. las áreas de una etapa o de un documento). */
export function AreaChecklist({ idPrefix, areas, selected, onChange, disabled }: AreaChecklistProps) {
  const toggle = (areaId: string) =>
    onChange(selected.includes(areaId) ? selected.filter((id) => id !== areaId) : [...selected, areaId]);

  return (
    <ul className="area-checklist">
      {areas.map((area) => (
        <li key={area.id}>
          <label className="area-checklist__item" htmlFor={`${idPrefix}-${area.id}`}>
            <input
              id={`${idPrefix}-${area.id}`}
              type="checkbox"
              className="doc-item__check"
              checked={selected.includes(area.id)}
              disabled={disabled}
              onChange={() => toggle(area.id)}
            />
            {area.name}
          </label>
        </li>
      ))}
    </ul>
  );
}
