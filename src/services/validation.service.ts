/**
 * Etapa 2 del flujo: el Manager revisa la ruta que propuso el Administrador,
 * suma o quita documentos y la confirma. Recién entonces el colaborador la ve.
 */
import { Jsi_onboardingsService } from '@/generated/services/Jsi_onboardingsService';
import { Jsi_documentassignmentsService } from '@/generated/services/Jsi_documentassignmentsService';
import { ASSIGNMENT_STATUS, VALIDATION_STATUS } from '@/shared/constants/choices';
import { todayIso } from '@/shared/lib/dates';
import type { RouteStage } from '@/shared/types/onboarding';
import { listAreas } from './areas.service';
import { ACTIVE_RECORDS, bind, fetchAll, unwrap } from './dataverse';
import { buildFullCatalog, computeStageDueDates, loadOnboardingCatalog } from './onboardingRoute.service';
import { getPeopleById } from './people.service';

type NewAssignmentRecord = Parameters<typeof Jsi_documentassignmentsService.create>[0];
type OnboardingChanges = Parameters<typeof Jsi_onboardingsService.update>[1];
type AssignmentChanges = Parameters<typeof Jsi_documentassignmentsService.update>[1];

/** Una inducción esperando la validación del Manager. */
export interface PendingOnboarding {
  onboardingId: string;
  collaborator: { id: string; fullName: string; jobTitle: string; email: string };
  areaName: string;
  hireDate: string | null;
  startDate: string | null;
  registeredByName: string | null;
  /** Documentos que ya tiene asignados: documentId → id de la asignación. */
  assignedDocuments: Map<string, string>;
}

export interface PendingValidationOverview {
  pending: PendingOnboarding[];
  /** Todas las etapas con todos sus documentos, para poder sumar o quitar. */
  catalog: RouteStage[];
}

/** Inducciones que el Manager indicado debe validar. */
export async function loadPendingValidations(managerId: string): Promise<PendingValidationOverview> {
  const [onboardings, people, areas, catalog] = await Promise.all([
    fetchAll(
      (o) => Jsi_onboardingsService.getAll(o),
      {
        select: ['jsi_onboardingid', '_jsi_employee_value', '_jsi_area_value', '_jsi_registeredby_value', 'jsi_startdate'],
        filter:
          `${ACTIVE_RECORDS} and _jsi_validator_value eq ${managerId}` +
          ` and jsi_validationstatus eq ${VALIDATION_STATUS.PendingValidation}`,
        orderBy: ['createdon asc'],
      },
      'Leer inducciones por validar',
    ),
    getPeopleById(),
    listAreas(),
    loadOnboardingCatalog(),
  ]);

  const onboardingIds = onboardings.map((o) => o.jsi_onboardingid);
  const assignments =
    onboardingIds.length === 0
      ? []
      : await fetchAll(
          (o) => Jsi_documentassignmentsService.getAll(o),
          {
            select: ['jsi_documentassignmentid', '_jsi_onboarding_value', '_jsi_document_value'],
            filter: `${ACTIVE_RECORDS} and (${onboardingIds.map((id) => `_jsi_onboarding_value eq ${id}`).join(' or ')})`,
          },
          'Leer documentos asignados',
        );

  const areaNames = new Map(areas.map((area) => [area.id, area.name]));

  const pending = onboardings.flatMap((onboarding): PendingOnboarding[] => {
    const person = onboarding._jsi_employee_value ? people.get(onboarding._jsi_employee_value) : undefined;
    if (!person) return [];

    const assignedDocuments = new Map<string, string>();
    for (const assignment of assignments) {
      if (assignment._jsi_onboarding_value === onboarding.jsi_onboardingid && assignment._jsi_document_value) {
        assignedDocuments.set(assignment._jsi_document_value, assignment.jsi_documentassignmentid);
      }
    }

    const registeredById = onboarding._jsi_registeredby_value;
    return [
      {
        onboardingId: onboarding.jsi_onboardingid,
        collaborator: {
          id: person.contactid,
          fullName: person.fullname ?? '',
          jobTitle: person.jsi_jobtitle ?? '',
          email: person.emailaddress1 ?? '',
        },
        areaName: (onboarding._jsi_area_value && areaNames.get(onboarding._jsi_area_value)) || '—',
        hireDate: person.jsi_hiredate ?? null,
        startDate: onboarding.jsi_startdate ?? null,
        registeredByName: (registeredById && people.get(registeredById)?.fullname) || null,
        assignedDocuments,
      },
    ];
  });

  return { pending, catalog: buildFullCatalog(catalog) };
}

/**
 * Confirma la ruta de un colaborador:
 * 1. Quita las asignaciones de los documentos destildados.
 * 2. Crea las asignaciones de los documentos sumados.
 * 3. Calcula el vencimiento de cada documento según el plazo de su etapa.
 * 4. Marca la inducción como validada (al final, para que solo se active si todo lo anterior salió bien).
 *
 * Si algo falla a mitad de camino, al recargar la pantalla se ve el estado real y se puede volver a confirmar.
 *
 * TODO: el correo de bienvenida lo enviará un flujo de Power Automate al cambiar
 * jsi_validationstatus a Validated.
 */
export async function confirmOnboarding(
  pending: PendingOnboarding,
  selectedDocumentIds: Set<string>,
  catalog: RouteStage[],
): Promise<void> {
  if (selectedDocumentIds.size === 0) throw new Error('Seleccione al menos un documento.');

  // Los plazos cuentan desde la fecha de inicio, o desde hoy si la validación llega después.
  const today = todayIso();
  const startDate = pending.startDate && pending.startDate.slice(0, 10) > today ? pending.startDate.slice(0, 10) : today;

  const routeStages = catalog
    .map((stage) => ({ ...stage, documents: stage.documents.filter((d) => selectedDocumentIds.has(d.id)) }))
    .filter((stage) => stage.documents.length > 0);
  const dueDates = computeStageDueDates(routeStages, startDate);

  // 1. Quitar
  const toRemove = [...pending.assignedDocuments].filter(([documentId]) => !selectedDocumentIds.has(documentId));
  await Promise.all(toRemove.map(([, assignmentId]) => Jsi_documentassignmentsService.delete(assignmentId)));

  // 2 y 3. Sumar los nuevos y poner el vencimiento a todos
  await Promise.all(
    routeStages.flatMap((stage) =>
      stage.documents.map(async (document) => {
        const dueDate = dueDates.get(stage.id) ?? undefined;
        const assignmentId = pending.assignedDocuments.get(document.id);

        if (assignmentId) {
          const changes: AssignmentChanges = { jsi_duedate: dueDate };
          unwrap(await Jsi_documentassignmentsService.update(assignmentId, changes), 'Actualizar vencimiento');
          return;
        }

        const record = {
          'jsi_Employee@odata.bind': bind('contacts', pending.collaborator.id),
          'jsi_Document@odata.bind': bind('jsi_documents', document.id),
          'jsi_Stage@odata.bind': bind('jsi_stages', stage.id),
          'jsi_Onboarding@odata.bind': bind('jsi_onboardings', pending.onboardingId),
          jsi_status: ASSIGNMENT_STATUS.Pending,
          jsi_duedate: dueDate,
          jsi_source: 'Agregado por el Manager',
        } as NewAssignmentRecord;
        unwrap(await Jsi_documentassignmentsService.create(record), 'Asignar documento');
      }),
    ),
  );

  // 4. Activar la ruta
  const changes: OnboardingChanges = {
    jsi_validationstatus: VALIDATION_STATUS.Validated,
    jsi_validatedon: new Date().toISOString(),
  };
  unwrap(await Jsi_onboardingsService.update(pending.onboardingId, changes), 'Validar inducción');
}
