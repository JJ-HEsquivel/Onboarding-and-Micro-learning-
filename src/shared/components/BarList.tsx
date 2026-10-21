interface BarListItem {
  key: string;
  label: string;
  /** 0 a 100 */
  value: number;
}

interface BarListProps {
  items: BarListItem[];
  /** Línea de referencia (ej. el mínimo de aprobación). */
  reference?: { value: number; label: string };
  /** Texto si no hay datos. */
  emptyText: string;
}

/**
 * Barras horizontales de un solo color para comparar porcentajes (ej. promedio por colaborador).
 * Cada barra lleva su valor escrito; la línea de referencia marca el mínimo.
 */
export function BarList({ items, reference, emptyText }: BarListProps) {
  if (items.length === 0) return <p className="bar-list__empty">{emptyText}</p>;

  return (
    <figure className="bar-list">
      {reference && (
        <figcaption className="bar-list__reference-label">
          <span className="bar-list__reference-swatch" aria-hidden="true" /> {reference.label}
        </figcaption>
      )}
      <ul>
        {items.map((item) => (
          <li key={item.key} className="bar-list__row" title={`${item.label}: ${item.value}%`}>
            <span className="bar-list__label">{item.label}</span>
            <span className="bar-list__track">
              <span className="bar-list__bar" style={{ width: `${Math.max(0, Math.min(100, item.value))}%` }} />
              {reference && <span className="bar-list__reference" style={{ left: `${reference.value}%` }} aria-hidden="true" />}
            </span>
            <span className="bar-list__value">{item.value}%</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
