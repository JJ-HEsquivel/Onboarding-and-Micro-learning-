import type { ReactNode } from 'react';

interface FormFieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

/** Etiqueta + control + mensaje de error/ayuda de un campo de formulario. */
export function FormField({ label, htmlFor, error, hint, children }: FormFieldProps) {
  return (
    <div className="form-field">
      <label className="form-field__label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error ? <p className="form-field__error">{error}</p> : hint && <p className="form-field__hint">{hint}</p>}
    </div>
  );
}
