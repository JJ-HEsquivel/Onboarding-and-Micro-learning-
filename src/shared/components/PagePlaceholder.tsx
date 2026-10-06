import { Construction } from 'lucide-react';
import { PageHeader } from './PageHeader';

interface PagePlaceholderProps {
  title: string;
  description?: string;
}

/** Pantalla temporal mientras se construye el contenido real. */
export function PagePlaceholder({ title, description }: PagePlaceholderProps) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <section className="placeholder">
        <Construction size={28} strokeWidth={1.75} />
        <p className="placeholder__title">Pantalla «{title}» en construcción</p>
        <p className="placeholder__text">El contenido de esta sección se implementará aquí.</p>
      </section>
    </>
  );
}
