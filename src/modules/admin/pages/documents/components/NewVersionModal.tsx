import { useCallback, useState, type FormEvent } from 'react';
import { Alert } from '@/shared/components/Alert';
import { Button } from '@/shared/components/Button';
import { FormField } from '@/shared/components/FormField';
import { Modal } from '@/shared/components/Modal';
import { compareVersions, isValidVersion, nextVersion, type ChangeLevel } from '@/shared/domain/documentVersion';
import { useAsync } from '@/shared/hooks/useAsync';
import { pluralize } from '@/shared/lib/format';
import type { ManagedDocument } from '@/shared/types/content';
import { getDocumentContent } from '@/services/documentCatalog.service';
import { getVersionImpact, publishVersion } from '@/services/documentVersion.service';

interface NewVersionModalProps {
  document: ManagedDocument;
  onClose: () => void;
  onPublished: (message: string) => void;
}

const FORM_ID = 'new-version-form';

const LEVELS: { value: ChangeLevel; title: string; detail: string }[] = [
  {
    value: 'major',
    title: 'Cambio mayor',
    detail: 'Cambia el fondo del documento. Quien está en inducción y ya lo leyó debe volver a leerlo y rendir su examen.',
  },
  {
    value: 'minor',
    title: 'Cambio menor',
    detail: 'Correcciones o aclaraciones. Solo se avisa a quienes lo tienen asignado.',
  },
];

export function NewVersionModal({ document, onClose, onPublished }: NewVersionModalProps) {
  const [level, setLevel] = useState<ChangeLevel>('minor');
  // null = usar la versión sugerida para el nivel elegido.
  const [customVersion, setCustomVersion] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  const [replaceContent, setReplaceContent] = useState(false);
  const [editedContent, setEditedContent] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const loadImpact = useCallback(() => getVersionImpact(document.id), [document.id]);
  const impact = useAsync(loadImpact);
  const loadContent = useCallback(() => getDocumentContent(document.id), [document.id]);
  const currentContent = useAsync(loadContent);
  const content = editedContent ?? currentContent.data ?? '';

  const version = customVersion ?? nextVersion(document.version, level);

  const versionError = !isValidVersion(version)
    ? 'Use el formato MAYOR.MENOR (ej. 2.0).'
    : compareVersions(version, document.version) <= 0
      ? `Debe ser mayor que la actual (${document.version}).`
      : undefined;
  const detailsError = details.trim() ? undefined : 'Describa qué cambió: se incluye en el aviso a los colaboradores.';
  const contentError = replaceContent && !content.trim() ? 'El contenido no puede quedar vacío.' : undefined;
  const hasErrors = Boolean(versionError || detailsError || contentError);

  const handleClose = useCallback(() => {
    if (!saving) onClose();
  }, [saving, onClose]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setShowErrors(true);
    if (hasErrors) return;

    setSaving(true);
    setSaveError(null);
    try {
      const result = await publishVersion({
        document,
        version,
        level,
        details,
        content: replaceContent ? content : null,
      });
      onPublished(
        `«${document.title}» pasó a la versión ${version}. Se avisó a ${pluralize(result.notified, 'persona', 'personas')}` +
          (result.reread ? ` y ${pluralize(result.reread, 'debe', 'deben')} volver a leerlo.` : '.'),
      );
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error));
      setSaving(false);
    }
  };

  return (
    <Modal
      title={`Nueva versión de ${document.code}`}
      description={`${document.title} · hoy en la versión ${document.version}`}
      onClose={handleClose}
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} disabled={saving}>
            {saving ? 'Publicando…' : `Publicar versión ${version}`}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} className="content-form" onSubmit={handleSubmit} noValidate>
        <fieldset className="content-form__choices">
          <legend className="visually-hidden">Tipo de cambio</legend>
          {LEVELS.map((option) => (
            <label key={option.value} className="choice-card">
              <input
                type="radio"
                name="change-level"
                checked={level === option.value}
                onChange={() => {
                  setLevel(option.value);
                  setCustomVersion(null);
                }}
              />
              <span>
                <strong>{option.title}</strong>
                <small>{option.detail}</small>
              </span>
            </label>
          ))}
        </fieldset>

        <div className="form-grid">
          <FormField label="Versión nueva" htmlFor="version-number" error={showErrors ? versionError : undefined}>
            <input
              id="version-number"
              className="input"
              maxLength={10}
              value={version}
              aria-invalid={showErrors && Boolean(versionError)}
              onChange={(e) => setCustomVersion(e.target.value)}
            />
          </FormField>
        </div>

        <FormField label="Qué cambió" htmlFor="version-details" error={showErrors ? detailsError : undefined}>
          <textarea
            id="version-details"
            className="input"
            rows={3}
            maxLength={2000}
            placeholder="Ej. Se actualizó el procedimiento para reportar incidentes."
            value={details}
            aria-invalid={showErrors && Boolean(detailsError)}
            onChange={(e) => setDetails(e.target.value)}
          />
        </FormField>

        <label className="content-form__inline" htmlFor="version-replace">
          <input
            id="version-replace"
            type="checkbox"
            className="doc-item__check"
            checked={replaceContent}
            onChange={(e) => setReplaceContent(e.target.checked)}
          />
          Actualizar también el contenido del lector
        </label>
        {replaceContent && (
          <FormField label="Contenido nuevo" htmlFor="version-content" error={showErrors ? contentError : undefined}>
            <textarea
              id="version-content"
              className="input content-form__content"
              disabled={currentContent.loading && currentContent.data === undefined}
              value={content}
              onChange={(e) => setEditedContent(e.target.value)}
            />
          </FormField>
        )}

        {impact.loading && <p className="cell-muted">Calculando a quiénes afecta…</p>}
        {impact.error && <Alert tone="danger">No se pudo calcular a quiénes afecta. {impact.error.message}</Alert>}
        {impact.data && (
          <Alert tone={level === 'major' && impact.data.toReread > 0 ? 'warning' : 'success'}>
            Se avisará a <strong>{pluralize(impact.data.notified, 'persona', 'personas')}</strong> que lo tienen en su ruta.
            {level === 'major' &&
              (impact.data.toReread > 0 ? (
                <>
                  {' '}
                  <strong>{pluralize(impact.data.toReread, 'persona', 'personas')}</strong> en inducción deberán volver a leerlo y
                  rendir su examen.
                </>
              ) : (
                ' Nadie en inducción lo había leído todavía, así que nadie debe releerlo.'
              ))}
          </Alert>
        )}

        {saveError && <Alert tone="danger">No se pudo publicar la versión. {saveError}</Alert>}
      </form>
    </Modal>
  );
}
