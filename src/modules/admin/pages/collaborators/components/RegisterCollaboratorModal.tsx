import { useCallback, useMemo, useState, type FormEvent } from 'react';
import { Alert } from '@/shared/components/Alert';
import { Button } from '@/shared/components/Button';
import { FormField } from '@/shared/components/FormField';
import { Modal } from '@/shared/components/Modal';
import { useAsync } from '@/shared/hooks/useAsync';
import { todayIso } from '@/shared/lib/format';
import type { Area, Manager, NewCollaboratorInput } from '@/shared/types/onboarding';
import { registerCollaborator } from '@/services/collaborators.service';
import { buildProposedRoute, loadOnboardingCatalog } from '@/services/onboardingRoute.service';
import { ProposedRoute } from './ProposedRoute';

interface RegisterCollaboratorModalProps {
  areas: Area[];
  managers: Manager[];
  onClose: () => void;
  /** Se llama cuando el registro termina bien, con el nombre del colaborador. */
  onRegistered: (fullName: string) => void;
}

type FormErrors = Partial<Record<keyof NewCollaboratorInput, string>>;

const FORM_ID = 'register-collaborator-form';

/** Formato básico de correo: algo@dominio.ext, sin espacios. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Reglas de validación del formulario (función pura). */
function validate(form: NewCollaboratorInput): FormErrors {
  const errors: FormErrors = {};
  if (!form.firstName.trim()) errors.firstName = 'Ingrese los nombres.';
  if (!form.lastName.trim()) errors.lastName = 'Ingrese los apellidos.';
  if (!form.email.trim()) errors.email = 'Ingrese el correo corporativo.';
  else if (!EMAIL_PATTERN.test(form.email.trim())) errors.email = 'Ingrese un correo válido (ej. ana.paredes@jalasoft.com).';
  if (!form.jobTitle.trim()) errors.jobTitle = 'Ingrese el cargo.';
  if (!form.areaId) errors.areaId = 'Seleccione un área.';
  if (!form.managerId) errors.managerId = 'Seleccione el manager responsable.';
  if (!form.hireDate) errors.hireDate = 'Seleccione la fecha de ingreso.';
  return errors;
}

export function RegisterCollaboratorModal({ areas, managers, onClose, onRegistered }: RegisterCollaboratorModalProps) {
  const catalog = useAsync(loadOnboardingCatalog);
  const [form, setForm] = useState<NewCollaboratorInput>(() => ({
    firstName: '',
    lastName: '',
    email: '',
    jobTitle: '',
    areaId: areas[0]?.id ?? '',
    managerId: managers.length === 1 ? managers[0].id : '',
    hireDate: todayIso(),
  }));
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const route = useMemo(
    () => (catalog.data && form.areaId ? buildProposedRoute(catalog.data, form.areaId) : []),
    [catalog.data, form.areaId],
  );
  const errors = showErrors ? validate(form) : {};
  const managerName = managers.find((manager) => manager.id === form.managerId)?.fullName;

  // Mientras se guarda no se permite cerrar, para no perder el resultado.
  const handleClose = useCallback(() => {
    if (!submitting) onClose();
  }, [submitting, onClose]);

  const updateField = (field: keyof NewCollaboratorInput, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setShowErrors(true);
    if (Object.keys(validate(form)).length > 0 || !catalog.data) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      await registerCollaborator(form, route);
      onRegistered(`${form.firstName.trim()} ${form.lastName.trim()}`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : String(error));
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Registrar colaborador"
      description="Etapa 1 del flujo: el Admin registra los datos. El correo de bienvenida se envía recién cuando el Manager valide la documentación."
      onClose={handleClose}
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} disabled={submitting || !catalog.data}>
            {submitting ? 'Registrando…' : 'Registrar (queda pendiente de validación)'}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} className="register-form" onSubmit={handleSubmit} noValidate>
        <div className="register-form__grid">
          <FormField label="Nombres" htmlFor="firstName" error={errors.firstName}>
            <input
              id="firstName"
              className="input"
              placeholder="Ej. Ana María"
              maxLength={50}
              value={form.firstName}
              aria-invalid={Boolean(errors.firstName)}
              onChange={(event) => updateField('firstName', event.target.value)}
            />
          </FormField>

          <FormField label="Apellidos" htmlFor="lastName" error={errors.lastName}>
            <input
              id="lastName"
              className="input"
              placeholder="Ej. Paredes Rojas"
              maxLength={50}
              value={form.lastName}
              aria-invalid={Boolean(errors.lastName)}
              onChange={(event) => updateField('lastName', event.target.value)}
            />
          </FormField>

          <FormField label="Cargo" htmlFor="jobTitle" error={errors.jobTitle}>
            <input
              id="jobTitle"
              className="input"
              placeholder="Ej. QA Engineer"
              maxLength={100}
              value={form.jobTitle}
              aria-invalid={Boolean(errors.jobTitle)}
              onChange={(event) => updateField('jobTitle', event.target.value)}
            />
          </FormField>

          <FormField label="Correo corporativo" htmlFor="email" error={errors.email}>
            <input
              id="email"
              type="email"
              className="input"
              placeholder="Ej. ana.paredes@jalasoft.com"
              maxLength={100}
              autoComplete="off"
              value={form.email}
              aria-invalid={Boolean(errors.email)}
              onChange={(event) => updateField('email', event.target.value)}
            />
          </FormField>

          <FormField label="Área" htmlFor="areaId" error={errors.areaId}>
            <select
              id="areaId"
              className="input"
              value={form.areaId}
              aria-invalid={Boolean(errors.areaId)}
              onChange={(event) => updateField('areaId', event.target.value)}
            >
              {areas.length === 0 && <option value="">No hay áreas registradas</option>}
              {areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            label="Manager responsable"
            htmlFor="managerId"
            error={errors.managerId}
            hint={
              managers.length === 0
                ? 'Para registrar colaboradores, primero asigne el rol Manager a una persona (tabla Role Assignment).'
                : undefined
            }
          >
            <select
              id="managerId"
              className="input"
              value={form.managerId}
              disabled={managers.length === 0}
              aria-invalid={Boolean(errors.managerId)}
              onChange={(event) => updateField('managerId', event.target.value)}
            >
              <option value="">{managers.length === 0 ? 'No hay managers registrados' : 'Seleccione un manager'}</option>
              {managers.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.fullName}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Fecha de ingreso" htmlFor="hireDate" error={errors.hireDate}>
            <input
              id="hireDate"
              type="date"
              className="input"
              value={form.hireDate}
              aria-invalid={Boolean(errors.hireDate)}
              onChange={(event) => updateField('hireDate', event.target.value)}
            />
          </FormField>
        </div>

        {catalog.error ? (
          <Alert tone="danger">No se pudo cargar la ruta de inducción: {catalog.error.message}</Alert>
        ) : (
          <ProposedRoute stages={route} loading={catalog.loading} />
        )}

        <Alert tone="warning">
          El colaborador <strong>no verá esta documentación</strong> hasta que{' '}
          <strong>{managerName ?? 'su manager'}</strong> la confirme en «Nuevos por validar».
        </Alert>

        {submitError && <Alert tone="danger">No se pudo registrar al colaborador. {submitError}</Alert>}
      </form>
    </Modal>
  );
}
