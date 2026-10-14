interface ProgressRingProps {
  /** 0 a 100 */
  value: number;
  label?: string;
  size?: number;
  tone?: 'primary' | 'success' | 'danger';
}

/** Anillo de porcentaje (ej. "65% aprobado"). */
export function ProgressRing({ value, label, size = 104, tone = 'primary' }: ProgressRingProps) {
  const percent = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      className={`progress-ring progress-ring--${tone}`}
      style={{ width: size, height: size, ['--ring-value' as string]: `${percent * 3.6}deg` }}
      role="img"
      aria-label={`${percent}%${label ? ` ${label}` : ''}`}
    >
      <div className="progress-ring__inner">
        <strong>{percent}%</strong>
        {label && <small>{label}</small>}
      </div>
    </div>
  );
}
