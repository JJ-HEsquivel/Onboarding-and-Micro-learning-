import type { MyStage } from '@/services/myDocuments.service';

/** Resumen: cuántos documentos leyó del total, con barra de avance. */
export function ReadingProgress({ stages }: { stages: MyStage[] }) {
  const documents = stages.flatMap((stage) => stage.documents);
  const read = documents.filter((document) => document.isRead).length;
  const percent = documents.length === 0 ? 0 : Math.round((read / documents.length) * 100);

  return (
    <section className="card reading-progress">
      <div className="reading-progress__text">
        <p className="reading-progress__title">Lecturas confirmadas</p>
        <p className="reading-progress__subtitle">
          {read} de {documents.length} documentos
        </p>
      </div>
      <div
        className="reading-progress__bar"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Avance de lectura"
      >
        <span style={{ width: `${percent}%` }} />
      </div>
      <strong className="reading-progress__percent">{percent}%</strong>
    </section>
  );
}
