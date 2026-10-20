import { useCallback, useState, type FormEvent } from 'react';
import { Alert } from '@/shared/components/Alert';
import { Button } from '@/shared/components/Button';
import { FormField } from '@/shared/components/FormField';
import { Modal } from '@/shared/components/Modal';
import type { Stage, StageInput } from '@/shared/types/content';
import type { Area } from '@/shared/types/onboarding';
import { saveStage } from '@/services/stages.service';
import { AreaChecklist } from '@/modules/admin/content/AreaChecklist';
import { parseOptionalInt } from '@/modules/admin/content/contentLabels';

interface StageFormModalProps {
  /** Etapa a editar; si no se indica, se crea una nueva. */
  stage?: Stage;
  areas: Area[];
  /** Orden sugerido para una etapa nueva (la siguiente a la última). */
  nextOrder: number;
  onClose: () => void;
  onSaved: (message: string) => void;
}

interface FormState {
  name: string;
  order: string;
  businessDays: string;
  isGeneral: boolean;
  areaIds: string[];
}

type FormErrors = Partial<Record<keyof FormState, string>>;

const FORM_ID = 'stage-form';

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.name.trim()) errors.name = 'Ingrese el nombre de la etapa.';
  const order = parseOptionalInt(form.order);
  if (order === null || Number.isNaN(order) || order === 0) errors.order = 'Ingrese un número entero mayor a 0.';
  const days = parseOptionalInt(form.businessDays);
  if (Number.isNaN(days) || days === 0) errors.businessDays = 'Ingrese un número entero mayor a 0, o déjelo vacío.';
  if (!form.isGeneral && form.areaIds.length === 0) errors.areaIds = 'Marque al menos un área.';
  return errors;
}

function toInput(form: FormState): StageInput {
  return {
    name: form.name.trim(),
    order: Number(form.order),
    businessDays: parseOptionalInt(form.businessDays),
    isGeneral: form.isGeneral,
    areaIds: form.isGeneral ? [] : form.areaIds,
  };
}

export function StageFormModal({ stage, areas, nextOrder, onClose, onSaved }: StageFormModalProps) {
  const [form, setForm] = useState<FormState>(() => ({
    name: stage?.name ?? '',
    order: String(stage?.order ?? nextOrder),
    businessDays: stage?.businessDays?.toString() ?? '5',
    isGeneral: stage?.isGeneral ?? false,
    areaIds: stage?.areaIds ?? [],
  }));
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const errors = showErrors ? validate(form) : {};
  const update = <K extends keyof FormState>(field: K, value: FormState[K]) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleClose = useCallback(() => {
    if (!saving) onClose();
  }, [saving, onClose]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setShowErrors(true);
    if (Object.keys(validate(form)).length > 0) return;

    setSaving(true);
    setSaveError(null);
    try {
      const input = toInput(form);
      await saveStage(input, stage?.id);
      onSaved(stage ? `Se guardaron los cambios de «${input.name}».` : `Se creó la etapa «${input.name}».`);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error));
      setSaving(false);
    }
  };

  return (
    <Modal
      title={stage ? 'Editar etapa' : 'Nueva etapa'}
      description="Los plazos se acumulan en orden: si la Etapa 1 tiene 5 días hábiles y la Etapa 2 otros 5, la Etapa 2 vence a los 10."
      onClose={handleClose}
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} disabled={saving}>
            {saving ? 'Guardando…' : stage ? 'Guardar cambios' : 'Crear etapa'}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} className="content-form" onSubmit={handleSubmit} noValidate>
        <FormField label="Nombre" htmlFor="stage-name" error={errors.name}>
          <input
            id="stage-name"
            className="input"
            maxLength={150}
            placeholder="Ej. Etapa 3 · Documentación específica: Engineering"
            value={form.name}
            aria-invalid={Boolean(errors.name)}
            onChange={(e) => update('name', e.target.value)}
          />
        </FormField>

        <div className="form-grid">
          <FormField label="Orden" htmlFor="stage-order" error={errors.order} hint="Las etapas por área suelen compartir el mismo orden (ej. 3).">
            <input
              id="stage-order"
              className="input"
              inputMode="numeric"
              value={form.order}
              aria-invalid={Boolean(errors.order)}
              onChange={(e) => update('order', e.target.value)}
            />
          </FormField>
          <FormField label="Plazo (días hábiles)" htmlFor="stage-days" error={errors.businessDays} hint="Vacío = sin plazo.">
            <input
              id="stage-days"
              className="input"
              inputMode="numeric"
              value={form.businessDays}
              aria-invalid={Boolean(errors.businessDays)}
              onChange={(e) => update('businessDays', e.target.value)}
            />
          </FormField>
        </div>

        <fieldset className="content-form__choices">
          <legend className="visually-hidden">Alcance</legend>
          <label className="choice-card">
            <input type="radio" name="stage-scope" checked={form.isGeneral} onChange={() => update('isGeneral', true)} />
            <span>
              <strong>General</strong>
              <small>Obligatoria para todas las áreas (ej. políticas fundamentales).</small>
            </span>
          </label>
          <label className="choice-card">
            <input type="radio" name="stage-scope" checked={!form.isGeneral} onChange={() => update('isGeneral', false)} />
            <span>
              <strong>Por área</strong>
              <small>Solo para las áreas elegidas. El Manager decide qué documentos suma o quita al validar.</small>
            </span>
          </label>
        </fieldset>

        {!form.isGeneral && (
          <div className="form-field">
            <span className="form-field__label">Áreas a las que aplica</span>
            <AreaChecklist idPrefix="stage-area" areas={areas} selected={form.areaIds} onChange={(ids) => update('areaIds', ids)} />
            {errors.areaIds && <p className="form-field__error">{errors.areaIds}</p>}
          </div>
        )}

        {stage && (
          <Alert tone="warning">
            Los cambios aplican a las rutas que se registren desde ahora. Las rutas ya asignadas conservan sus documentos y fechas.
          </Alert>
        )}
        {saveError && <Alert tone="danger">No se pudo guardar la etapa. {saveError}</Alert>}
      </form>
    </Modal>
  );
}
