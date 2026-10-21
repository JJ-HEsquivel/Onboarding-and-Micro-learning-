/**
 * Reglas del programa de inducción (las mismas que usa el prototipo).
 * TODO (fase 5): leerlas de una tabla de configuración editable desde "Configuración".
 */
export const PROGRAM_RULES = {
  /** Puntaje mínimo para aprobar un examen (%). */
  passingScore: 80,
  /** Intentos por examen. */
  maxAttempts: 3,
  /** Días corridos para rendir el examen desde que se confirma la lectura. */
  examDueDays: 3,
  /** Días sin actividad a partir de los que el colaborador aparece en "Requiere atención". */
  inactivityDays: 3,
  /** Días de plazo para leer un documento que el Manager suma a la Etapa 3. */
  extraDocumentDueDays: 5,
  /** Solo se puede ascender a Manager a quien completó su inducción. */
  requireCompletedOnboardingForPromotion: true,
} as const;

/** Las tres fases que recorre todo colaborador. */
export const ONBOARDING_PHASES = [
  {
    number: 1,
    name: 'Registro y bienvenida',
    detail:
      'El Administrador da de alta al colaborador y le asigna un Manager, que valida su documentación. Al confirmarla se activa su ruta.',
  },
  {
    number: 2,
    name: 'Proceso de inducción',
    detail:
      'Lectura de cada documento asignado por etapas y aprobación de su examen. La inducción se completa cuando todos los documentos están aprobados.',
  },
  {
    number: 3,
    name: 'Micro aprendizaje y actualización de documentos',
    detail:
      'Refuerzo continuo con evaluaciones cortas periódicas y relectura obligatoria cuando un documento cambia de versión.',
  },
] as const;
