import { useEffect, useId, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface DrawerProps {
  title: ReactNode;
  /** Contenido debajo del título (ej. cargo y etiquetas). */
  subtitle?: ReactNode;
  /** Ícono o avatar a la izquierda del título. */
  leading?: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  children: ReactNode;
}

/** Panel lateral derecho (ej. la ficha de un colaborador). Se cierra con la X, Escape o clic fuera. */
export function Drawer({ title, subtitle, leading, footer, onClose, children }: DrawerProps) {
  const titleId = useId();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="drawer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="drawer__header">
          {leading}
          <div className="drawer__heading">
            <h2 id={titleId} className="drawer__title">
              {title}
            </h2>
            {subtitle}
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </header>
        <div className="drawer__body">{children}</div>
        {footer && <footer className="drawer__footer">{footer}</footer>}
      </aside>
    </div>
  );
}
