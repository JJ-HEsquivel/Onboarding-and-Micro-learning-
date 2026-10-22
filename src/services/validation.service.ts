/**
 * Etapa 2 del flujo: el Manager revisa la ruta que propuso el Administrador y la confirma.
 * - Las Etapas 1 y 2 son obligatorias: no se pueden quitar.
 * - En la Etapa 3 del área puede quitar los documentos propuestos o sumar los demás del área.
 * Al confirmar se fijan los vencimientos, se crea el examen de cada documento (bloqueado hasta
 * que el colaborador confirme la lectura) y la inducción queda validada.
 */
import { Jsi_onboardingsService } from '@/generated/services/Jsi_onboardingsService';
import { Jsi_documentassignmentsService } from '@/generated/services/Jsi_documentassignmentsService';
import { Jsi_assessmentassignmentsService } from '@/generated/services/Jsi_assessmentassignmentsService';
import { ASSIGNMENT_STATUS, EXAM_STATUS, VALIDATION_STATUS } from '@/shared/constants/choices';
import { formatDate, todayIso } from '@/shared/lib/dates';
import type { RouteStage } from '@/shared/types/onboarding';
import { listAreas } from './areas.service';
import { ACTIVE_RECORDS, bind, fetchAll, unwrap } from './dataverse';
import { buildAreaRoute, computeStageDueDates, filterRoute, loadOnboardingCatalog } from './onboardingRoute.service';
import { notify } from './notification.service';
import { getPeopleById } from './people.service';

type NewAssignmentRecord = Parameters<typeof Jsi_documentassignmentsService.create>[0];
type NewExamRecord = Parameters<typeof Jsi_assessmentassignmentsService.create>[0];
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
  /** Todas las etapas y documentos que aplican a su área. */
  areaRoute: RouteStage[];
  /** Documentos que ya tiene asignados (propuestos por el Admin): documentId → id de la asignación. */
  assignedDocuments: Map<string, string>;
}

/** Inducciones que el Manager indicado debe validar. */
export async function loadPendingValidations(managerId: string): Promise<PendingOnboarding[]> {
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
          'Leer documentos propuestos',
        );

  const areaNames = new Map(areas.map((area) => [area.id, area.name]));

  return onboardings.flatMap((onboarding): PendingOnboarding[] => {
    const person = onboarding._jsi_employee_value ? people.get(onboarding._jsi_employee_value) : undefined;
    const areaId = onboarding._jsi_area_value;
    if (!person || !areaId) return [];

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
          id: person.jsi_personid,
          fullName: person.jsi_fullname ?? '',
          jobTitle: person.jsi_jobtitle ?? '',
          email: person.jsi_email ?? '',
        },
        areaName: areaNames.get(areaId) ?? '—',
        hireDate: person.jsi_hiredate ?? null,
        startDate: onboarding.jsi_startdate ?? null,
        registeredByName: (registeredById && people.get(registeredById)?.jsi_fullname) || null,
        areaRoute: buildAreaRoute(catalog, areaId),
        assignedDocuments,
      },
    ];
  });
}

/** Valida la selección del Manager. Devuelve el motivo si no es válida, o null. */
export function validateSelection(areaRoute: RouteStage[], selected: Set<string>): string | null {
  const areaStages = areaRoute.filter((stage) => !stage.isGeneral);
  const hasAreaDocuments = areaStages.some((stage) => stage.documents.length > 0);
  const selectedInArea = areaStages.some((stage) => stage.documents.some((d) => selected.has(d.id)));
  if (hasAreaDocuments && !selectedInArea) return 'Seleccione al menos un documento de la Etapa 3 de su área.';
  return null;
}

/**
 * Confirma la ruta de un colaborador:
 * 1. Quita las asignaciones de los documentos destildados de la Etapa 3.
 * 2. Crea las asignaciones de los documentos sumados.
 * 3. Fija el vencimiento de cada documento según el plazo de su etapa.
 * 4. Crea el examen de cada documento, bloqueado hasta que confirme la lectura.
 * 5. Marca la inducción como validada (al final, para que solo se active si todo salió bien).
 *
 * Si algo falla a mitad de camino, al recargar la pantalla se ve el estado real y se puede volver a confirmar.
 * TODO (fase 5): Power Automate enviará el correo de bienvenida al pasar a "Validated".
 */
export async function confirmOnboarding(pending: PendingOnboarding, selectedEtapa3: Set<string>): Promise<void> {
  // Las etapas generales siempre van completas; de la Etapa 3, lo que eligió el Manager.
  const selected = new Set(selectedEtapa3);
  pending.areaRoute.filter((stage) => stage.isGeneral).forEach((stage) => stage.documents.forEach((d) => selected.add(d.id)));

  const problem = validateSelection(pending.areaRoute, selected);
  if (problem) throw new Error(problem);

  // Los plazos cuentan desde la fecha de ingreso, o desde hoy si la validación llega después.
  const today = todayIso();
  const start = pending.startDate?.slice(0, 10);
  const startDate = start && start > today ? start : today;

  const route = filterRoute(pending.areaRoute, selected);
  const dueDates = computeStageDueDates(route, startDate);
  const { collaborator, onboardingId } = pending;

  // 1. Quitar
  const toRemove = [...pending.assignedDocuments].filter(([documentId]) => !selected.has(documentId));
  await Promise.all(toRemove.map(([, assignmentId]) => Jsi_documentassignmentsService.delete(assignmentId)));

  // 2, 3 y 4. Sumar, poner vencimientos y crear exámenes
  await Promise.all(
    route.flatMap((stage) =>
      stage.documents.map(async (document) => {
        const dueDate = dueDates.get(stage.id) ?? undefined;
        const assignmentId = pending.assignedDocuments.get(document.id);

        if (assignmentId) {
          const changes: AssignmentChanges = { jsi_duedate: dueDate };
          unwrap(await Jsi_documentassignmentsService.update(assignmentId, changes), 'Actualizar vencimiento');
        } else {
          const record = {
            'jsi_Employee@odata.bind': bind('jsi_persons', collaborator.id),
            'jsi_Document@odata.bind': bind('jsi_documents', document.id),
            'jsi_Stage@odata.bind': bind('jsi_stages', stage.id),
            'jsi_Onboarding@odata.bind': bind('jsi_onboardings', onboardingId),
            jsi_status: ASSIGNMENT_STATUS.Pending,
            jsi_duedate: dueDate,
            jsi_source: 'Agregado por el Manager',
          } as NewAssignmentRecord;
          unwrap(await Jsi_documentassignmentsService.create(record), 'Asignar documento');
        }

        if (document.assessmentId) {
          const exam = {
            'jsi_Employee@odata.bind': bind('jsi_persons', collaborator.id),
            'jsi_Assessment@odata.bind': bind('jsi_assessments', document.assessmentId),
            'jsi_Onboarding@odata.bind': bind('jsi_onboardings', onboardingId),
            jsi_status: EXAM_STATUS.Locked,
            jsi_attemptsused: 0,
          } as NewExamRecord;
          unwrap(await Jsi_assessmentassignmentsService.create(exam), 'Crear examen');
        }
      }),
    ),
  );

  // 5. Activar la ruta
  const changes: OnboardingChanges = {
    jsi_validationstatus: VALIDATION_STATUS.Validated,
    jsi_validatedon: new Date().toISOString(),
  };
  unwrap(await Jsi_onboardingsService.update(onboardingId, changes), 'Validar inducción');

  // 6. Bienvenida: recién ahora la persona puede ver su ruta. El correo lo envía el flujo
  //    de Power Automate que se dispara al crearse el aviso (ver docs/entrega/02-arquitectura.md).
  const documentCount = route.reduce((sum, stage) => sum + stage.documents.length, 0);
  const firstDue = [...dueDates.values()].find((date) => date !== null);
  await notify({
    personId: collaborator.id,
    type: 'Welcome',
    title: 'Bienvenido al programa de inducción',
    details:
      `Su ruta de inducción ya está disponible: ${documentCount} documento(s) por leer y aprobar` +
      (firstDue ? `, empezando por la primera etapa, con plazo hasta el ${formatDate(firstDue)}.` : '.'),
  });
}
