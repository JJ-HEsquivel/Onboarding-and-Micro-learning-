// =============================================================================
// schema.mjs
// Definicion declarativa del modelo de datos de "Onboarding and Micro-learning"
// para Microsoft Dataverse. Este archivo NO ejecuta nada: solo describe datos.
// El motor que lee esto y llama a la Web API es create-tables.mjs.
//
// Convenciones:
//  - Todo nombre logico/tecnico esta en ingles, en minusculas, sin espacios
//    ni tildes, con el prefijo de publisher (CONFIG.publisherPrefix).
//  - "schemaName" es el nombre que Dataverse usa para generar el logicalName
//    (ej. SchemaName "jsi_Area" -> LogicalName "jsi_area").
//  - Los Choice (option set) son LOCALES a cada columna (no Global Choices),
//    para simplificar la primera version. Se pueden promover a Global Choice
//    mas adelante desde la interfaz si se desea reutilizarlos.
// =============================================================================

export const CONFIG = {
  // Prefijo de publisher aprobado. Usalo igual en TODAS las tablas/columnas.
  publisherPrefix: 'jsi',
  publisherUniqueName: 'jalasoftonboarding',
  publisherFriendlyName: 'Jalasoft Onboarding',
  // Rango de OptionValuePrefix exigido por Dataverse para publishers nuevos
  // (debe estar entre 10000 y 99999, y no colisionar con otro publisher
  // existente en el mismo entorno). Si el script detecta que ya existe un
  // publisher con el prefijo 'jsi', reutiliza el que ya este creado.
  publisherOptionValuePrefix: 10001,
  solutionUniqueName: 'OnboardingMicroLearning',
  solutionFriendlyName: 'Onboarding and Micro-learning',
  solutionVersion: '1.0.0.0',
};

// Helper: genera un option set local secuencial. Cada atributo tiene su
// propio rango, asi que no hay riesgo de colision entre columnas distintas.
const choice = (labels) => labels.map((label, i) => ({ value: 100000000 + i, label }));

const REQUIRED = 'ApplicationRequired';
const RECOMMENDED = 'Recommended';
const OPTIONAL = 'None';

// -----------------------------------------------------------------------------
// Tipos de columna soportados por el motor (create-tables.mjs):
//   'String'   -> texto de una linea (maxLength)
//   'Memo'     -> texto multilinea
//   'Integer'  -> entero
//   'Decimal'  -> decimal (precision)
//   'Boolean'  -> Yes/No (trueLabel/falseLabel)
//   'DateOnly' -> fecha sin hora
//   'DateTime' -> fecha y hora
//   'Picklist' -> Choice local (options: choice([...]))
//   'Lookup'   -> relacion 1:N hacia otra tabla (target, relationshipSchemaName)
//   'File'     -> columna de archivo
// -----------------------------------------------------------------------------

export const TABLES = [
  // =====================================================================
  // CATALOGO BASE
  // =====================================================================
  {
    schemaName: 'jsi_Area',
    displayName: 'Area', displayCollectionName: 'Areas',
    ownershipType: 'Organization',
    description: 'Business areas/departments of the organization.',
    primaryColumn: { schemaName: 'jsi_Name', displayName: 'Name', maxLength: 100 },
    columns: [
      { schemaName: 'jsi_Code', type: 'String', displayName: 'Code', maxLength: 10, requiredLevel: REQUIRED },
    ],
  },
  {
    schemaName: 'jsi_Stage',
    displayName: 'Stage', displayCollectionName: 'Stages',
    ownershipType: 'Organization',
    description: 'Onboarding program stage (Stage 1, Stage 2, Stage 3 per area).',
    primaryColumn: { schemaName: 'jsi_Name', displayName: 'Name', maxLength: 150 },
    columns: [
      { schemaName: 'jsi_Order', type: 'Integer', displayName: 'Order', requiredLevel: REQUIRED },
      { schemaName: 'jsi_BusinessDaysDeadline', type: 'Integer', displayName: 'Business Days Deadline', requiredLevel: RECOMMENDED },
      {
        schemaName: 'jsi_Scope', type: 'Picklist', displayName: 'Scope', requiredLevel: REQUIRED,
        options: choice(['General', 'AreaSpecific']),
      },
    ],
  },
  {
    schemaName: 'jsi_StageArea', // JUNCTION TABLE (Stage N:N Area)
    displayName: 'Stage Area', displayCollectionName: 'Stage Areas',
    ownershipType: 'Organization',
    description: 'Junction table: which Areas a Stage applies to.',
    primaryColumn: { schemaName: 'jsi_Name', displayName: 'Name', maxLength: 200, autoNumber: 'STGA-{SEQNUM:5}' },
    columns: [
      { schemaName: 'jsi_Stage', type: 'Lookup', displayName: 'Stage', requiredLevel: REQUIRED, target: 'jsi_Stage', relationshipSchemaName: 'jsi_stage_stagearea' },
      { schemaName: 'jsi_Area', type: 'Lookup', displayName: 'Area', requiredLevel: REQUIRED, target: 'jsi_Area', relationshipSchemaName: 'jsi_area_stagearea' },
    ],
  },
  {
    schemaName: 'jsi_DocumentCategory',
    displayName: 'Document Category', displayCollectionName: 'Document Categories',
    ownershipType: 'Organization',
    description: 'High-level topic used to classify documents.',
    primaryColumn: { schemaName: 'jsi_Name', displayName: 'Name', maxLength: 100 },
    columns: [],
  },

  // =====================================================================
  // DOCUMENTOS
  // =====================================================================
  {
    schemaName: 'jsi_Document',
    displayName: 'Document', displayCollectionName: 'Documents',
    ownershipType: 'Organization',
    description: 'A policy/manual document that is part of the onboarding program.',
    primaryColumn: { schemaName: 'jsi_Title', displayName: 'Title', maxLength: 200 },
    columns: [
      { schemaName: 'jsi_Code', type: 'String', displayName: 'Code', maxLength: 30, requiredLevel: REQUIRED },
      { schemaName: 'jsi_Version', type: 'String', displayName: 'Version', maxLength: 10, requiredLevel: REQUIRED },
      { schemaName: 'jsi_Stage', type: 'Lookup', displayName: 'Stage', requiredLevel: REQUIRED, target: 'jsi_Stage', relationshipSchemaName: 'jsi_stage_document' },
      { schemaName: 'jsi_Category', type: 'Lookup', displayName: 'Category', requiredLevel: OPTIONAL, target: 'jsi_DocumentCategory', relationshipSchemaName: 'jsi_documentcategory_document' },
      { schemaName: 'jsi_Criticality', type: 'Picklist', displayName: 'Criticality', requiredLevel: REQUIRED, options: choice(['High', 'Medium', 'Low']) },
      { schemaName: 'jsi_Status', type: 'Picklist', displayName: 'Status', requiredLevel: REQUIRED, options: choice(['Current', 'Updated', 'Draft']) },
      { schemaName: 'jsi_Mandatory', type: 'Boolean', displayName: 'Mandatory', trueLabel: 'Yes', falseLabel: 'No', defaultValue: true },
      { schemaName: 'jsi_PageCount', type: 'Integer', displayName: 'Page Count', requiredLevel: OPTIONAL },
      { schemaName: 'jsi_ReadingMinutes', type: 'Integer', displayName: 'Reading Minutes', requiredLevel: OPTIONAL },
      { schemaName: 'jsi_UpdatedOn', type: 'DateOnly', displayName: 'Updated On', requiredLevel: OPTIONAL },
      { schemaName: 'jsi_OwningDepartment', type: 'String', displayName: 'Owning Department', maxLength: 100, requiredLevel: OPTIONAL },
      { schemaName: 'jsi_Summary', type: 'Memo', displayName: 'Summary', maxLength: 2000, requiredLevel: OPTIONAL },
      { schemaName: 'jsi_File', type: 'File', displayName: 'File', requiredLevel: OPTIONAL },
    ],
  },
  {
    schemaName: 'jsi_DocumentArea', // JUNCTION TABLE (Document N:N Area)
    displayName: 'Document Area', displayCollectionName: 'Document Areas',
    ownershipType: 'Organization',
    description: 'Junction table: audience areas of a Document.',
    primaryColumn: { schemaName: 'jsi_Name', displayName: 'Name', maxLength: 200, autoNumber: 'DOCA-{SEQNUM:5}' },
    columns: [
      { schemaName: 'jsi_Document', type: 'Lookup', displayName: 'Document', requiredLevel: REQUIRED, target: 'jsi_Document', relationshipSchemaName: 'jsi_document_documentarea' },
      { schemaName: 'jsi_Area', type: 'Lookup', displayName: 'Area', requiredLevel: REQUIRED, target: 'jsi_Area', relationshipSchemaName: 'jsi_area_documentarea' },
    ],
  },
  {
    schemaName: 'jsi_DocumentVersion',
    displayName: 'Document Version', displayCollectionName: 'Document Versions',
    ownershipType: 'Organization',
    description: 'Version history of a Document.',
    primaryColumn: { schemaName: 'jsi_Name', displayName: 'Name', maxLength: 50 },
    columns: [
      { schemaName: 'jsi_Document', type: 'Lookup', displayName: 'Document', requiredLevel: REQUIRED, target: 'jsi_Document', relationshipSchemaName: 'jsi_document_documentversion' },
      { schemaName: 'jsi_Version', type: 'String', displayName: 'Version', maxLength: 10, requiredLevel: REQUIRED },
      { schemaName: 'jsi_ReleaseDate', type: 'DateOnly', displayName: 'Release Date', requiredLevel: OPTIONAL },
      { schemaName: 'jsi_ChangeLevel', type: 'Picklist', displayName: 'Change Level', requiredLevel: REQUIRED, options: choice(['Major', 'Minor']) },
      { schemaName: 'jsi_ChangeDetails', type: 'Memo', displayName: 'Change Details', maxLength: 2000, requiredLevel: OPTIONAL },
    ],
  },

  // =====================================================================
  // EVALUACIONES
  // =====================================================================
  {
    schemaName: 'jsi_Assessment',
    displayName: 'Assessment', displayCollectionName: 'Assessments',
    ownershipType: 'Organization',
    description: 'An assessment, usually one per Stage, optionally ad-hoc per Document.',
    primaryColumn: { schemaName: 'jsi_Title', displayName: 'Title', maxLength: 200 },
    columns: [
      { schemaName: 'jsi_Stage', type: 'Lookup', displayName: 'Stage', requiredLevel: OPTIONAL, target: 'jsi_Stage', relationshipSchemaName: 'jsi_stage_assessment' },
      { schemaName: 'jsi_Document', type: 'Lookup', displayName: 'Document', requiredLevel: OPTIONAL, target: 'jsi_Document', relationshipSchemaName: 'jsi_document_assessment' },
      { schemaName: 'jsi_Origin', type: 'Picklist', displayName: 'Origin', requiredLevel: REQUIRED, options: choice(['Stage', 'DocumentUpdate', 'Campaign', 'Manual']) },
      { schemaName: 'jsi_DurationMinutes', type: 'Integer', displayName: 'Duration Minutes', requiredLevel: OPTIONAL },
      { schemaName: 'jsi_PassingScore', type: 'Integer', displayName: 'Passing Score', requiredLevel: REQUIRED },
      { schemaName: 'jsi_MaxAttempts', type: 'Integer', displayName: 'Max Attempts', requiredLevel: REQUIRED },
      { schemaName: 'jsi_DeadlineDays', type: 'Integer', displayName: 'Deadline Days', requiredLevel: OPTIONAL },
      { schemaName: 'jsi_GeneratedBy', type: 'String', displayName: 'Generated By', maxLength: 100, requiredLevel: OPTIONAL },
      { schemaName: 'jsi_Date', type: 'DateOnly', displayName: 'Date', requiredLevel: OPTIONAL },
    ],
  },
  {
    schemaName: 'jsi_Question',
    displayName: 'Question', displayCollectionName: 'Questions',
    ownershipType: 'Organization',
    description: 'A question that belongs to an Assessment.',
    primaryColumn: { schemaName: 'jsi_Text', displayName: 'Text', maxLength: 500 },
    columns: [
      { schemaName: 'jsi_Assessment', type: 'Lookup', displayName: 'Assessment', requiredLevel: REQUIRED, target: 'jsi_Assessment', relationshipSchemaName: 'jsi_assessment_question' },
      { schemaName: 'jsi_Explanation', type: 'Memo', displayName: 'Explanation', maxLength: 2000, requiredLevel: OPTIONAL },
      { schemaName: 'jsi_Order', type: 'Integer', displayName: 'Order', requiredLevel: OPTIONAL },
      { schemaName: 'jsi_Active', type: 'Boolean', displayName: 'Active', trueLabel: 'Yes', falseLabel: 'No', defaultValue: true },
    ],
  },
  {
    schemaName: 'jsi_AnswerOption',
    displayName: 'Answer Option', displayCollectionName: 'Answer Options',
    ownershipType: 'Organization',
    description: 'An answer option that belongs to a Question.',
    primaryColumn: { schemaName: 'jsi_Text', displayName: 'Text', maxLength: 300 },
    columns: [
      { schemaName: 'jsi_Question', type: 'Lookup', displayName: 'Question', requiredLevel: REQUIRED, target: 'jsi_Question', relationshipSchemaName: 'jsi_question_answeroption' },
      { schemaName: 'jsi_Order', type: 'Integer', displayName: 'Order', requiredLevel: OPTIONAL },
      { schemaName: 'jsi_IsCorrect', type: 'Boolean', displayName: 'Is Correct', trueLabel: 'Yes', falseLabel: 'No', defaultValue: false },
    ],
  },

  // =====================================================================
  // PERSONAS: ROLES E INDUCCIONES
  // La persona existe UNA sola vez (contact). Sus roles y sus inducciones
  // son registros aparte, asi una persona puede tener varios roles a la vez
  // (ej. Manager y Administrador) y conservar el historial de sus inducciones.
  // =====================================================================
  {
    schemaName: 'jsi_RoleAssignment',
    displayName: 'Role Assignment', displayCollectionName: 'Role Assignments',
    ownershipType: 'Organization',
    description: 'A role held by a person in the app (a person can hold several).',
    primaryColumn: { schemaName: 'jsi_Name', displayName: 'Name', maxLength: 100, autoNumber: 'ROLE-{SEQNUM:5}' },
    columns: [
      { schemaName: 'jsi_Person', type: 'Lookup', displayName: 'Person', requiredLevel: REQUIRED, target: 'contact', relationshipSchemaName: 'jsi_contact_roleassignment' },
      { schemaName: 'jsi_Role', type: 'Picklist', displayName: 'Role', requiredLevel: REQUIRED, options: choice(['Administrator', 'Manager', 'Collaborator']) },
      { schemaName: 'jsi_StartDate', type: 'DateOnly', displayName: 'Start Date', requiredLevel: OPTIONAL },
      { schemaName: 'jsi_EndDate', type: 'DateOnly', displayName: 'End Date', requiredLevel: OPTIONAL },
      { schemaName: 'jsi_IsActive', type: 'Boolean', displayName: 'Is Active', trueLabel: 'Yes', falseLabel: 'No', defaultValue: true },
    ],
  },
  {
    schemaName: 'jsi_Onboarding',
    displayName: 'Onboarding', displayCollectionName: 'Onboardings',
    ownershipType: 'UserOwned',
    description: 'One onboarding process of a person (initial onboarding or a later one, e.g. after a promotion).',
    primaryColumn: { schemaName: 'jsi_Name', displayName: 'Name', maxLength: 100, autoNumber: 'ONB-{SEQNUM:5}' },
    columns: [
      { schemaName: 'jsi_Employee', type: 'Lookup', displayName: 'Employee', requiredLevel: REQUIRED, target: 'contact', relationshipSchemaName: 'jsi_contact_onboarding' },
      { schemaName: 'jsi_Validator', type: 'Lookup', displayName: 'Validator', requiredLevel: OPTIONAL, target: 'contact', relationshipSchemaName: 'jsi_contact_onboarding_validator' },
      { schemaName: 'jsi_RegisteredBy', type: 'Lookup', displayName: 'Registered By', requiredLevel: OPTIONAL, target: 'contact', relationshipSchemaName: 'jsi_contact_onboarding_registeredby' },
      { schemaName: 'jsi_Area', type: 'Lookup', displayName: 'Area', requiredLevel: REQUIRED, target: 'jsi_Area', relationshipSchemaName: 'jsi_area_onboarding' },
      { schemaName: 'jsi_Type', type: 'Picklist', displayName: 'Type', requiredLevel: REQUIRED, options: choice(['Initial', 'RoleChange']) },
      { schemaName: 'jsi_ValidationStatus', type: 'Picklist', displayName: 'Validation Status', requiredLevel: REQUIRED, options: choice(['PendingValidation', 'Validated']) },
      { schemaName: 'jsi_ProgressStatus', type: 'Picklist', displayName: 'Progress Status', requiredLevel: REQUIRED, options: choice(['NotStarted', 'InProgress', 'Overdue', 'Completed']) },
      { schemaName: 'jsi_RiskLevel', type: 'Picklist', displayName: 'Risk Level', requiredLevel: REQUIRED, options: choice(['Low', 'Medium', 'High']) },
      { schemaName: 'jsi_StartDate', type: 'DateOnly', displayName: 'Start Date', requiredLevel: RECOMMENDED },
      { schemaName: 'jsi_ValidatedOn', type: 'DateTime', displayName: 'Validated On', requiredLevel: OPTIONAL },
      { schemaName: 'jsi_CompletedOn', type: 'DateOnly', displayName: 'Completed On', requiredLevel: OPTIONAL },
    ],
  },

  // =====================================================================
  // SEGUIMIENTO POR COLABORADOR (Employee = tabla estandar "contact")
  // =====================================================================
  {
    schemaName: 'jsi_DocumentAssignment',
    displayName: 'Document Assignment', displayCollectionName: 'Document Assignments',
    ownershipType: 'UserOwned',
    description: 'A document assigned to one employee, with its reading status.',
    primaryColumn: { schemaName: 'jsi_Name', displayName: 'Name', maxLength: 200, autoNumber: 'DOCA-{SEQNUM:6}' },
    columns: [
      { schemaName: 'jsi_Employee', type: 'Lookup', displayName: 'Employee', requiredLevel: REQUIRED, target: 'contact', relationshipSchemaName: 'jsi_contact_documentassignment' },
      { schemaName: 'jsi_Document', type: 'Lookup', displayName: 'Document', requiredLevel: REQUIRED, target: 'jsi_Document', relationshipSchemaName: 'jsi_document_documentassignment' },
      { schemaName: 'jsi_Stage', type: 'Lookup', displayName: 'Stage', requiredLevel: OPTIONAL, target: 'jsi_Stage', relationshipSchemaName: 'jsi_stage_documentassignment' },
      { schemaName: 'jsi_Onboarding', type: 'Lookup', displayName: 'Onboarding', requiredLevel: OPTIONAL, target: 'jsi_Onboarding', relationshipSchemaName: 'jsi_onboarding_documentassignment' },
      { schemaName: 'jsi_Status', type: 'Picklist', displayName: 'Status', requiredLevel: REQUIRED, options: choice(['Pending', 'Read']) },
      { schemaName: 'jsi_ConfirmedOn', type: 'DateTime', displayName: 'Confirmed On', requiredLevel: OPTIONAL },
      { schemaName: 'jsi_DueDate', type: 'DateOnly', displayName: 'Due Date', requiredLevel: OPTIONAL },
      { schemaName: 'jsi_Source', type: 'String', displayName: 'Source', maxLength: 150, requiredLevel: OPTIONAL },
    ],
  },
  {
    schemaName: 'jsi_AssessmentAssignment',
    displayName: 'Assessment Assignment', displayCollectionName: 'Assessment Assignments',
    ownershipType: 'UserOwned',
    description: 'An assessment assigned to one employee, with its progress.',
    primaryColumn: { schemaName: 'jsi_Name', displayName: 'Name', maxLength: 200, autoNumber: 'ASGN-{SEQNUM:6}' },
    columns: [
      { schemaName: 'jsi_Employee', type: 'Lookup', displayName: 'Employee', requiredLevel: REQUIRED, target: 'contact', relationshipSchemaName: 'jsi_contact_assessmentassignment' },
      { schemaName: 'jsi_Assessment', type: 'Lookup', displayName: 'Assessment', requiredLevel: REQUIRED, target: 'jsi_Assessment', relationshipSchemaName: 'jsi_assessment_assessmentassignment' },
      { schemaName: 'jsi_CampaignDelivery', type: 'Lookup', displayName: 'Campaign Delivery', requiredLevel: OPTIONAL, target: 'jsi_CampaignDelivery', relationshipSchemaName: 'jsi_campaigndelivery_assessmentassignment' },
      { schemaName: 'jsi_Onboarding', type: 'Lookup', displayName: 'Onboarding', requiredLevel: OPTIONAL, target: 'jsi_Onboarding', relationshipSchemaName: 'jsi_onboarding_assessmentassignment' },
      { schemaName: 'jsi_Status', type: 'Picklist', displayName: 'Status', requiredLevel: REQUIRED, options: choice(['Locked', 'Pending', 'Passed', 'Failed']) },
      { schemaName: 'jsi_Score', type: 'Integer', displayName: 'Score', requiredLevel: OPTIONAL },
      { schemaName: 'jsi_AttemptsUsed', type: 'Integer', displayName: 'Attempts Used', requiredLevel: OPTIONAL },
      { schemaName: 'jsi_DueDate', type: 'DateOnly', displayName: 'Due Date', requiredLevel: OPTIONAL },
      { schemaName: 'jsi_ResolvedOn', type: 'DateTime', displayName: 'Resolved On', requiredLevel: OPTIONAL },
    ],
  },
  {
    schemaName: 'jsi_AssessmentAttempt',
    displayName: 'Assessment Attempt', displayCollectionName: 'Assessment Attempts',
    ownershipType: 'UserOwned',
    description: 'One attempt taken against an Assessment Assignment.',
    primaryColumn: { schemaName: 'jsi_Name', displayName: 'Name', maxLength: 200, autoNumber: 'ATPT-{SEQNUM:6}' },
    columns: [
      { schemaName: 'jsi_Assignment', type: 'Lookup', displayName: 'Assignment', requiredLevel: REQUIRED, target: 'jsi_AssessmentAssignment', relationshipSchemaName: 'jsi_assessmentassignment_assessmentattempt' },
      { schemaName: 'jsi_AttemptNumber', type: 'Integer', displayName: 'Attempt Number', requiredLevel: REQUIRED },
      { schemaName: 'jsi_Score', type: 'Integer', displayName: 'Score', requiredLevel: OPTIONAL },
      { schemaName: 'jsi_TakenOn', type: 'DateTime', displayName: 'Taken On', requiredLevel: OPTIONAL },
      { schemaName: 'jsi_DurationSeconds', type: 'Integer', displayName: 'Duration Seconds', requiredLevel: OPTIONAL },
    ],
  },
  {
    schemaName: 'jsi_QuestionResponse',
    displayName: 'Question Response', displayCollectionName: 'Question Responses',
    ownershipType: 'UserOwned',
    description: 'The answer an employee picked for one Question within an Attempt.',
    primaryColumn: { schemaName: 'jsi_Name', displayName: 'Name', maxLength: 200, autoNumber: 'RESP-{SEQNUM:6}' },
    columns: [
      { schemaName: 'jsi_Attempt', type: 'Lookup', displayName: 'Attempt', requiredLevel: REQUIRED, target: 'jsi_AssessmentAttempt', relationshipSchemaName: 'jsi_assessmentattempt_questionresponse' },
      { schemaName: 'jsi_Question', type: 'Lookup', displayName: 'Question', requiredLevel: REQUIRED, target: 'jsi_Question', relationshipSchemaName: 'jsi_question_questionresponse' },
      { schemaName: 'jsi_SelectedOption', type: 'Lookup', displayName: 'Selected Option', requiredLevel: OPTIONAL, target: 'jsi_AnswerOption', relationshipSchemaName: 'jsi_answeroption_questionresponse' },
      { schemaName: 'jsi_IsCorrect', type: 'Boolean', displayName: 'Is Correct', trueLabel: 'Yes', falseLabel: 'No', defaultValue: false },
    ],
  },

  // =====================================================================
  // CAMPANAS DE REFUERZO
  // =====================================================================
  {
    schemaName: 'jsi_Campaign',
    displayName: 'Campaign', displayCollectionName: 'Campaigns',
    ownershipType: 'UserOwned',
    description: 'A recurring micro-learning reinforcement campaign.',
    primaryColumn: { schemaName: 'jsi_Name', displayName: 'Name', maxLength: 200 },
    columns: [
      { schemaName: 'jsi_Document', type: 'Lookup', displayName: 'Document', requiredLevel: REQUIRED, target: 'jsi_Document', relationshipSchemaName: 'jsi_document_campaign' },
      { schemaName: 'jsi_Focus', type: 'Picklist', displayName: 'Focus', requiredLevel: REQUIRED, options: choice(['GapReinforcement', 'Awareness', 'Wellbeing', 'Manual']) },
      { schemaName: 'jsi_Frequency', type: 'Picklist', displayName: 'Frequency', requiredLevel: REQUIRED, options: choice(['Daily', 'Weekly', 'Biweekly', 'Monthly']) },
      { schemaName: 'jsi_AssessmentCount', type: 'Integer', displayName: 'Assessment Count', requiredLevel: REQUIRED },
      { schemaName: 'jsi_Status', type: 'Picklist', displayName: 'Status', requiredLevel: REQUIRED, options: choice(['Draft', 'Active', 'Paused', 'Finished']) },
      { schemaName: 'jsi_AISuggested', type: 'Boolean', displayName: 'AI Suggested', trueLabel: 'Yes', falseLabel: 'No', defaultValue: false },
      { schemaName: 'jsi_NextDate', type: 'DateOnly', displayName: 'Next Date', requiredLevel: OPTIONAL },
    ],
  },
  {
    schemaName: 'jsi_CampaignArea', // JUNCTION TABLE (Campaign N:N Area)
    displayName: 'Campaign Area', displayCollectionName: 'Campaign Areas',
    ownershipType: 'Organization',
    description: 'Junction table: audience areas of a Campaign.',
    primaryColumn: { schemaName: 'jsi_Name', displayName: 'Name', maxLength: 200, autoNumber: 'CPGA-{SEQNUM:5}' },
    columns: [
      { schemaName: 'jsi_Campaign', type: 'Lookup', displayName: 'Campaign', requiredLevel: REQUIRED, target: 'jsi_Campaign', relationshipSchemaName: 'jsi_campaign_campaignarea' },
      { schemaName: 'jsi_Area', type: 'Lookup', displayName: 'Area', requiredLevel: REQUIRED, target: 'jsi_Area', relationshipSchemaName: 'jsi_area_campaignarea' },
    ],
  },
  {
    schemaName: 'jsi_CampaignDelivery',
    displayName: 'Campaign Delivery', displayCollectionName: 'Campaign Deliveries',
    ownershipType: 'UserOwned',
    description: 'One scheduled send of a Campaign (one Assessment on one date).',
    primaryColumn: { schemaName: 'jsi_Name', displayName: 'Name', maxLength: 200, autoNumber: 'DLVR-{SEQNUM:6}' },
    columns: [
      { schemaName: 'jsi_Campaign', type: 'Lookup', displayName: 'Campaign', requiredLevel: REQUIRED, target: 'jsi_Campaign', relationshipSchemaName: 'jsi_campaign_campaigndelivery' },
      { schemaName: 'jsi_Assessment', type: 'Lookup', displayName: 'Assessment', requiredLevel: REQUIRED, target: 'jsi_Assessment', relationshipSchemaName: 'jsi_assessment_campaigndelivery' },
      { schemaName: 'jsi_SequenceNumber', type: 'Integer', displayName: 'Sequence Number', requiredLevel: REQUIRED },
      { schemaName: 'jsi_SendDate', type: 'DateOnly', displayName: 'Send Date', requiredLevel: OPTIONAL },
      { schemaName: 'jsi_Status', type: 'Picklist', displayName: 'Status', requiredLevel: REQUIRED, options: choice(['Scheduled', 'Sent']) },
    ],
  },

  // =====================================================================
  // AUDITORIA
  // =====================================================================
  {
    schemaName: 'jsi_Notification',
    displayName: 'Notification', displayCollectionName: 'Notifications',
    ownershipType: 'UserOwned',
    description: 'A notification sent to an employee.',
    primaryColumn: { schemaName: 'jsi_Title', displayName: 'Title', maxLength: 200 },
    columns: [
      { schemaName: 'jsi_Employee', type: 'Lookup', displayName: 'Employee', requiredLevel: REQUIRED, target: 'contact', relationshipSchemaName: 'jsi_contact_notification' },
      { schemaName: 'jsi_Type', type: 'Picklist', displayName: 'Type', requiredLevel: REQUIRED, options: choice(['Reminder', 'DocumentUpdate', 'Assessment', 'Campaign', 'Welcome']) },
      { schemaName: 'jsi_Details', type: 'Memo', displayName: 'Details', maxLength: 2000, requiredLevel: OPTIONAL },
      { schemaName: 'jsi_Date', type: 'DateTime', displayName: 'Date', requiredLevel: OPTIONAL },
      { schemaName: 'jsi_Status', type: 'Picklist', displayName: 'Status', requiredLevel: REQUIRED, options: choice(['Sent', 'Read']) },
    ],
  },
  {
    schemaName: 'jsi_Evidence',
    displayName: 'Evidence', displayCollectionName: 'Evidence Records',
    ownershipType: 'UserOwned',
    description: 'Audit trail of a reading confirmation or assessment result.',
    primaryColumn: { schemaName: 'jsi_Name', displayName: 'Name', maxLength: 200, autoNumber: 'EVID-{SEQNUM:6}' },
    columns: [
      { schemaName: 'jsi_Employee', type: 'Lookup', displayName: 'Employee', requiredLevel: REQUIRED, target: 'contact', relationshipSchemaName: 'jsi_contact_evidence' },
      { schemaName: 'jsi_Document', type: 'Lookup', displayName: 'Document', requiredLevel: OPTIONAL, target: 'jsi_Document', relationshipSchemaName: 'jsi_document_evidence' },
      { schemaName: 'jsi_Assessment', type: 'Lookup', displayName: 'Assessment', requiredLevel: OPTIONAL, target: 'jsi_Assessment', relationshipSchemaName: 'jsi_assessment_evidence' },
      { schemaName: 'jsi_Version', type: 'String', displayName: 'Version', maxLength: 10, requiredLevel: OPTIONAL },
      { schemaName: 'jsi_Date', type: 'DateTime', displayName: 'Date', requiredLevel: OPTIONAL },
      { schemaName: 'jsi_Hash', type: 'String', displayName: 'Hash', maxLength: 128, requiredLevel: OPTIONAL },
    ],
  },
  {
    schemaName: 'jsi_Gap',
    displayName: 'Gap', displayCollectionName: 'Gaps',
    ownershipType: 'Organization',
    description: 'Periodic snapshot of a comprehension gap on a Document topic.',
    primaryColumn: { schemaName: 'jsi_Topic', displayName: 'Topic', maxLength: 200 },
    columns: [
      { schemaName: 'jsi_Document', type: 'Lookup', displayName: 'Document', requiredLevel: REQUIRED, target: 'jsi_Document', relationshipSchemaName: 'jsi_document_gap' },
      { schemaName: 'jsi_ErrorPercentage', type: 'Decimal', displayName: 'Error Percentage', precision: 2, requiredLevel: OPTIONAL },
      { schemaName: 'jsi_AffectedCount', type: 'Integer', displayName: 'Affected Count', requiredLevel: OPTIONAL },
      { schemaName: 'jsi_Trend', type: 'Picklist', displayName: 'Trend', requiredLevel: REQUIRED, options: choice(['Rising', 'Stable', 'Falling']) },
      { schemaName: 'jsi_CutoffDate', type: 'DateOnly', displayName: 'Cutoff Date', requiredLevel: OPTIONAL },
    ],
  },
];

// =============================================================================
// Extension de la tabla estandar "contact" (la PERSONA). NO se crea la tabla,
// solo se agregan columnas y relaciones si faltan.
// Solo guarda datos de la persona; los roles estan en jsi_RoleAssignment y el
// avance de la induccion en jsi_Onboarding.
// El correo usa la columna estandar "emailaddress1".
// =============================================================================
export const TABLE_EXTENSIONS = [
  {
    targetTable: 'contact',
    columns: [
      { schemaName: 'jsi_JobTitle', type: 'String', displayName: 'Job Title', maxLength: 100, requiredLevel: OPTIONAL },
      { schemaName: 'jsi_Area', type: 'Lookup', displayName: 'Area', requiredLevel: REQUIRED, target: 'jsi_Area', relationshipSchemaName: 'jsi_area_contact' },
      { schemaName: 'jsi_Manager', type: 'Lookup', displayName: 'Manager', requiredLevel: OPTIONAL, target: 'contact', relationshipSchemaName: 'jsi_contact_manager_contact' },
      { schemaName: 'jsi_HireDate', type: 'DateOnly', displayName: 'Hire Date', requiredLevel: OPTIONAL },
    ],
  },
];

// =============================================================================
// Columnas que existieron en versiones anteriores y se deben BORRAR.
// create-tables.mjs nunca borra nada; las borra remove-columns.mjs.
// =============================================================================
export const REMOVED_COLUMNS = [
  { table: 'contact', column: 'jsi_onboardingstatus', reason: 'Ahora es jsi_onboarding.jsi_validationstatus' },
  { table: 'contact', column: 'jsi_progressstatus', reason: 'Ahora es jsi_onboarding.jsi_progressstatus' },
  { table: 'contact', column: 'jsi_risklevel', reason: 'Ahora es jsi_onboarding.jsi_risklevel' },
  { table: 'contact', column: 'jsi_userrole', reason: 'Reemplazada por la tabla jsi_roleassignment' },
];
