// =============================================================================
// security-roles.mjs
// Matriz de permisos de los ROLES DE SEGURIDAD de Dataverse (los que el servidor
// hace cumplir, aunque alguien use otra herramienta para entrar a los datos).
// Este archivo NO ejecuta nada; lo aplica create-security-roles.mjs.
//
// Letras de cada permiso:
//   C = Create (crear)      R = Read (leer)        W = Write (modificar)
//   D = Delete (borrar)     A = Append (asignar un lookup EN esta tabla)
//   T = AppendTo (que OTRA tabla apunte a esta con un lookup)
//
// Alcance: 'Global' (toda la organizacion). Hoy los registros de seguimiento los
// crea el Admin o el Manager, asi que su propietario no es el colaborador y un
// alcance "Usuario" lo dejaria sin ver su propia induccion. Cuando cada persona
// este vinculada a su cuenta (jsi_person.jsi_user), los registros se asignaran a
// esa cuenta y el Colaborador pasara a alcance 'Basic' (solo lo suyo).
//
// Ademas de su rol, cada usuario necesita el rol estandar "Basic User" del entorno.
// =============================================================================

export const ROLE_DEPTH = 'Global';

const CATALOG = [
  'jsi_area', 'jsi_stage', 'jsi_stagearea', 'jsi_documentcategory', 'jsi_document', 'jsi_documentarea',
  'jsi_documentversion', 'jsi_assessment', 'jsi_question', 'jsi_answeroption',
  'jsi_campaign', 'jsi_campaignarea', 'jsi_campaigndelivery', 'jsi_gap',
];

/** El mismo permiso para todo el catalogo. */
const catalog = (letters) => Object.fromEntries(CATALOG.map((table) => [table, letters]));

export const SECURITY_ROLES = [
  {
    name: 'Onboarding - Administrador',
    description: 'Gestiona el programa: personas, roles, catalogo y avance de todos.',
    privileges: {
      ...catalog('CRWDAT'),
      jsi_person: 'CRWDAT',
      jsi_roleassignment: 'CRWDAT',
      jsi_onboarding: 'CRWDAT',
      jsi_documentassignment: 'CRWDAT',
      jsi_assessmentassignment: 'CRWDAT',
      jsi_assessmentattempt: 'RT',
      jsi_questionresponse: 'R',
      jsi_notification: 'CRWDAT',
      // La evidencia es de auditoria: se crea y se lee, nadie la modifica ni la borra.
      jsi_evidence: 'CRA',
    },
  },
  {
    name: 'Onboarding - Manager',
    description: 'Valida y acompana a su equipo: rutas, documentos asignados y resultados.',
    privileges: {
      ...catalog('RT'),
      jsi_person: 'RT',
      jsi_roleassignment: 'R',
      jsi_onboarding: 'RWAT',
      jsi_documentassignment: 'CRWDAT',
      jsi_assessmentassignment: 'CRWDAT',
      jsi_assessmentattempt: 'R',
      jsi_questionresponse: 'R',
      jsi_notification: 'CRA',
      jsi_evidence: 'CRA',
    },
  },
  {
    name: 'Onboarding - Colaborador',
    description: 'Lee sus documentos, confirma lecturas y rinde sus examenes.',
    privileges: {
      ...catalog('RT'),
      jsi_person: 'RT',
      jsi_roleassignment: 'R',
      // Al confirmar una lectura o rendir un examen se recalcula y guarda el avance.
      jsi_onboarding: 'RW',
      jsi_documentassignment: 'RWT',
      jsi_assessmentassignment: 'RWT',
      jsi_assessmentattempt: 'CRAT',
      jsi_questionresponse: 'CRA',
      jsi_notification: 'RW',
      jsi_evidence: 'CRA',
    },
  },
];
