import { useCallback, useState, type FormEvent } from 'react';
import { Eye, Pencil } from 'lucide-react';
import { Alert } from '@/shared/components/Alert';
import { Button } from '@/shared/components/Button';
import { FormField } from '@/shared/components/FormField';
import { Modal } from '@/shared/components/Modal';
import { useAsync } from '@/shared/hooks/useAsync';
import type { Criticality, DocumentCategory, DocumentInput, ManagedDocument, Stage } from '@/shared/types/content';
import type { Area } from '@/shared/types/onboarding';
import { createDocument, getDocumentContent, isCodeTaken, updateDocument } from '@/services/documentCatalog.service';
import { parseContent } from '@/services/documents.service';
import { AreaChecklist } from '@/modules/admin/content/AreaChecklist';
import { CRITICALITY_LABEL, parseOptionalInt } from '@/modules/admin/content/contentLabels';

interface DocumentFormModalProps {
  /** Documento a editar; si no se indica, se crea uno nuevo. */
  document?: ManagedDocument;
  stages: Stage[];
  categories: DocumentCategory[];
  areas: Area[];
  onClose: () => void;
  onSaved: (message: string) => void;
}

/** Los campos numéricos se guardan como texto mientras se escriben. */
interface FormState {
  code: string;
  title: string;
  stageId: string;
  categoryId: string;
  criticality: Criticality;
  isDraft: boolean;
  isDefault: boolean;
  readingMinutes: string;
  pages: string;
  owner: string;
  summary: string;
  areaIds: string[];
}

type FormErrors = Partial<Record<keyof FormState | 'content', string>>;

const FORM_ID = 'document-form';
/** Mayúsculas, números y guiones: "POL-TI-001". */
const CODE_PATTERN = /^[A-Z0-9][A-Z0-9-]*$/;

function initialState(document: ManagedDocument | undefined, stages: Stage[], categories: DocumentCategory[]): FormState {
  return {
    code: document?.code ?? '',
    title: document?.title ?? '',
    stageId: document?.stageId ?? stages[0]?.id ?? '',
    categoryId: document?.categoryId ?? categories[0]?.id ?? '',
    criticality: document?.criticality ?? 'medium',
    // Un documento nuevo nace como borrador: se publica cuando el contenido esté listo.
    isDraft: document ? document.status === 'draft' : true,
    isDefault: document?.isDefault ?? true,
    readingMinutes: document?.readingMinutes?.toString() ?? '',
    pages: document?.pages?.toString() ?? '',
    owner: document?.owner ?? '',
    summary: document?.summary ?? '',
    areaIds: document?.areaIds ?? [],
  };
}

/** Reglas de validación (función pura). */
function validate(form: FormState, content: string): FormErrors {
  const errors: FormErrors = {};
  if (!form.code.trim()) errors.code = 'Ingrese el código.';
  else if (!CODE_PATTERN.test(form.code.trim())) errors.code = 'Use mayúsculas, números y guiones (ej. POL-TI-001).';
  if (!form.title.trim()) errors.title = 'Ingrese el título.';
  if (!form.stageId) errors.stageId = 'Seleccione la etapa.';
  if (!form.categoryId) errors.categoryId = 'Seleccione la categoría.';
  const minutes = parseOptionalInt(form.readingMinutes);
  if (Number.isNaN(minutes) || minutes === 0) errors.readingMinutes = 'Ingrese un número entero mayor a 0.';
  const pages = parseOptionalInt(form.pages);
  if (Number.isNaN(pages) || pages === 0) errors.pages = 'Ingrese un número entero mayor a 0.';
  // Un documento publicado se muestra en el lector: necesita contenido.
  if (!form.isDraft && !content.trim()) errors.content = 'Para publicarlo, escriba su contenido (o guárdelo como borrador).';
  return errors;
}

function toInput(form: FormState, content: string): DocumentInput {
  return {
    ...form,
    code: form.code.trim(),
    title: form.title.trim(),
    readingMinutes: parseOptionalInt(form.readingMinutes),
    pages: parseOptionalInt(form.pages),
    content,
  };
}

export function DocumentFormModal({ document, stages, categories, areas, onClose, onSaved }: DocumentFormModalProps) {
  const [form, setForm] = useState(() => initialState(document, stages, categories));
  // El contenido puede ser largo, por eso se lee recién al abrir el formulario.
  const loadContent = useCallback(() => (document ? getDocumentContent(document.id) : Promise.resolve('')), [document]);
  const savedContent = useAsync(loadContent);
  const [editedContent, setEditedContent] = useState<string | null>(null);
  const content = editedContent ?? savedContent.data ?? '';

  const [showPreview, setShowPreview] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);

  const errors = showErrors ? validate(form, content) : {};
  const selectedStage = stages.find((s) => s.id === form.stageId);
  const contentReady = !savedContent.loading || savedContent.data !== undefined;

  const update = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === 'code') setCodeError(null);
  };

  const handleClose = useCallback(() => {
    if (!saving) onClose();
  }, [saving, onClose]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setShowErrors(true);
    if (Object.keys(validate(form, content)).length > 0) return;

    setSaving(true);
    setSaveError(null);
    try {
      if (await isCodeTaken(form.code, document?.id)) {
        setCodeError('Ya existe otro documento con este código.');
        setSaving(false);
        return;
      }
      const input = toInput(form, content);
      if (document) {
        await updateDocument(document, input);
        onSaved(`Se guardaron los cambios de «${input.title}».`);
      } else {
        await createDocument(input);
        onSaved(`«${input.title}» se creó en la versión 1.0${input.isDraft ? ' como borrador' : ''}.`);
      }
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error));
      setSaving(false);
    }
  };

  return (
    <Modal
      title={document ? `Editar ${document.code}` : 'Nuevo documento'}
      description={
        document
          ? `Versión ${document.version}. Para publicar un cambio de contenido que deban conocer los colaboradores, use «Nueva versión».`
          : 'Se crea en la versión 1.0. Mientras sea borrador no se asigna a nadie.'
      }
      onClose={handleClose}
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} disabled={saving || !contentReady}>
            {saving ? 'Guardando…' : document ? 'Guardar cambios' : 'Crear documento'}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} className="content-form" onSubmit={handleSubmit} noValidate>
        <div className="form-grid">
          <FormField label="Código" htmlFor="doc-code" error={codeError ?? errors.code}>
            <input
              id="doc-code"
              className="input"
              placeholder="Ej. POL-TI-001"
              maxLength={30}
              value={form.code}
              aria-invalid={Boolean(codeError ?? errors.code)}
              onChange={(e) => update('code', e.target.value.toUpperCase())}
            />
          </FormField>
          <FormField label="Título" htmlFor="doc-title" error={errors.title}>
            <input
              id="doc-title"
              className="input"
              maxLength={200}
              value={form.title}
              aria-invalid={Boolean(errors.title)}
              onChange={(e) => update('title', e.target.value)}
            />
          </FormField>

          <FormField label="Etapa" htmlFor="doc-stage" error={errors.stageId}>
            <select id="doc-stage" className="input" value={form.stageId} onChange={(e) => update('stageId', e.target.value)}>
              {stages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Categoría" htmlFor="doc-category" error={errors.categoryId}>
            <select id="doc-category" className="input" value={form.categoryId} onChange={(e) => update('categoryId', e.target.value)}>
              {categories.length === 0 && <option value="">No hay categorías</option>}
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Criticidad" htmlFor="doc-criticality">
            <select
              id="doc-criticality"
              className="input"
              value={form.criticality}
              onChange={(e) => update('criticality', e.target.value as Criticality)}
            >
              {(Object.keys(CRITICALITY_LABEL) as Criticality[]).map((key) => (
                <option key={key} value={key}>
                  {CRITICALITY_LABEL[key].label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Área responsable" htmlFor="doc-owner" hint="Quién mantiene el documento (ej. Enterprise Information Security).">
            <input id="doc-owner" className="input" maxLength={100} value={form.owner} onChange={(e) => update('owner', e.target.value)} />
          </FormField>

          <FormField label="Minutos de lectura" htmlFor="doc-minutes" error={errors.readingMinutes}>
            <input
              id="doc-minutes"
              className="input"
              inputMode="numeric"
              value={form.readingMinutes}
              aria-invalid={Boolean(errors.readingMinutes)}
              onChange={(e) => update('readingMinutes', e.target.value)}
            />
          </FormField>
          <FormField label="Páginas" htmlFor="doc-pages" error={errors.pages}>
            <input
              id="doc-pages"
              className="input"
              inputMode="numeric"
              value={form.pages}
              aria-invalid={Boolean(errors.pages)}
              onChange={(e) => update('pages', e.target.value)}
            />
          </FormField>
        </div>

        <FormField label="Resumen" htmlFor="doc-summary" hint="Se muestra al inicio del lector.">
          <textarea id="doc-summary" className="input" rows={2} maxLength={2000} value={form.summary} onChange={(e) => update('summary', e.target.value)} />
        </FormField>

        <div className="form-field">
          <div className="content-form__label-row">
            <label className="form-field__label" htmlFor="doc-content">
              Contenido
            </label>
            <Button variant="ghost" onClick={() => setShowPreview((value) => !value)}>
              {showPreview ? <Pencil size={15} /> : <Eye size={15} />}
              {showPreview ? 'Editar' : 'Vista previa'}
            </Button>
          </div>
          {showPreview ? (
            <div className="content-preview">
              {parseContent(content).map((section, i) => (
                <section key={i}>
                  {section.title && <h4>{section.title}</h4>}
                  <p>{section.body}</p>
                </section>
              ))}
              {!content.trim() && <p className="cell-muted">Sin contenido.</p>}
            </div>
          ) : (
            <textarea
              id="doc-content"
              className="input content-form__content"
              disabled={!contentReady}
              value={contentReady ? content : 'Cargando contenido…'}
              aria-invalid={Boolean(errors.content)}
              placeholder={'## 1. Alcance\nA quién aplica el documento.\n\n## 2. Reglas\nQué debe cumplir el colaborador.'}
              onChange={(e) => setEditedContent(e.target.value)}
            />
          )}
          {errors.content ? (
            <p className="form-field__error">{errors.content}</p>
          ) : (
            <p className="form-field__hint">Cada sección empieza con «## Título»; debajo van sus párrafos.</p>
          )}
          {savedContent.error && <Alert tone="danger">No se pudo leer el contenido actual. {savedContent.error.message}</Alert>}
        </div>

        <div className="form-field">
          <span className="form-field__label">Áreas destinatarias</span>
          <AreaChecklist idPrefix="doc-area" areas={areas} selected={form.areaIds} onChange={(ids) => update('areaIds', ids)} />
          <p className="form-field__hint">Sin marcar ninguna, aplica a todas las áreas de su etapa.</p>
        </div>

        {selectedStage && !selectedStage.isGeneral && (
          <label className="content-form__inline" htmlFor="doc-default">
            <input
              id="doc-default"
              type="checkbox"
              className="doc-item__check"
              checked={form.isDefault}
              onChange={(e) => update('isDefault', e.target.checked)}
            />
            Proponerlo por defecto al registrar a alguien del área (el Manager puede quitarlo al validar).
          </label>
        )}

        <label className="content-form__inline" htmlFor="doc-draft">
          <input
            id="doc-draft"
            type="checkbox"
            className="doc-item__check"
            checked={form.isDraft}
            onChange={(e) => update('isDraft', e.target.checked)}
          />
          Borrador: no se asigna a nadie hasta desmarcar esta opción.
        </label>

        {saveError && <Alert tone="danger">No se pudo guardar el documento. {saveError}</Alert>}
      </form>
    </Modal>
  );
}
