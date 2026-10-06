import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: ReactNode;
  caption?: string;
}

/** Tarjeta de indicador (KPI): título, valor grande y una línea de detalle. */
export function StatCard({ label, value, caption }: StatCardProps) {
  return (
    <article className="card stat-card">
      <p className="stat-card__label">{label}</p>
      <p className="stat-card__value">{value}</p>
      {caption && <p className="stat-card__caption">{caption}</p>}
    </article>
  );
}
