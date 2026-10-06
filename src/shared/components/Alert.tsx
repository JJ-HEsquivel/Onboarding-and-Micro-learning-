import type { ReactNode } from 'react';
import { CircleAlert, CircleCheck, TriangleAlert, X } from 'lucide-react';

interface AlertProps {
  tone: 'success' | 'warning' | 'danger';
  children: ReactNode;
  onDismiss?: () => void;
}

const ICONS = { success: CircleCheck, warning: TriangleAlert, danger: CircleAlert };

export function Alert({ tone, children, onDismiss }: AlertProps) {
  const Icon = ICONS[tone];
  return (
    <div className={`alert alert--${tone}`} role={tone === 'danger' ? 'alert' : 'status'}>
      <Icon size={18} className="alert__icon" />
      <div className="alert__content">{children}</div>
      {onDismiss && (
        <button type="button" className="alert__close" onClick={onDismiss} aria-label="Cerrar aviso">
          <X size={16} />
        </button>
      )}
    </div>
  );
}
