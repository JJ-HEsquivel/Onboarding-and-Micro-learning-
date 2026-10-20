/**
 * Etapas del programa (jsi_stage) y las áreas a las que aplica cada una (jsi_stagearea).
 *
 * Las etapas no se borran desde la app: sus documentos y las rutas ya asignadas las
 * referencian (en Dataverse la relación es "Restrict"). Para dejar de usar una etapa,
 * se mueven sus documentos a otra.
 */
import { Jsi_stagesService } from '@/generated/services/Jsi_stagesService';
import { Jsi_stageareasService } from '@/generated/services/Jsi_stageareasService';
import { STAGE_SCOPE } from '@/shared/constants/choices';
import { diffSets } from '@/shared/lib/collections';
import type { Stage, StageInput } from '@/shared/types/content';
import { ACTIVE_RECORDS, bind, fetchAll, unwrap } from './dataverse';

type NewStageRecord = Parameters<typeof Jsi_stagesService.create>[0];
type StageChanges = Parameters<typeof Jsi_stagesService.update>[1];
type NewStageAreaRecord = Parameters<typeof Jsi_stageareasService.create>[0];

/** Etapas activas ordenadas (orden y nombre), con sus áreas. */
export async function listStages(): Promise<Stage[]> {
  const [stages, stageAreas] = await Promise.all([
    fetchAll(
      (o) => Jsi_stagesService.getAll(o),
      { select: ['jsi_stageid', 'jsi_name', 'jsi_order', 'jsi_scope', 'jsi_businessdaysdeadline'], filter: ACTIVE_RECORDS },
      'Leer etapas',
    ),
    fetchAll(
      (o) => Jsi_stageareasService.getAll(o),
      { select: ['_jsi_stage_value', '_jsi_area_value'], filter: ACTIVE_RECORDS },
      'Leer etapas por área',
    ),
  ]);

  return stages
    .map((s) => ({
      id: s.jsi_stageid,
      name: s.jsi_name ?? '',
      order: s.jsi_order,
      isGeneral: s.jsi_scope === STAGE_SCOPE.General,
      businessDays: s.jsi_businessdaysdeadline ?? null,
      areaIds: stageAreas.flatMap((sa) => (sa._jsi_stage_value === s.jsi_stageid && sa._jsi_area_value ? [sa._jsi_area_value] : [])),
    }))
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}

/** Deja en jsi_stagearea exactamente las áreas indicadas para la etapa. */
async function syncStageAreas(stageId: string, areaIds: string[]): Promise<void> {
  const rows = await fetchAll(
    (o) => Jsi_stageareasService.getAll(o),
    { select: ['jsi_stageareaid', '_jsi_area_value'], filter: `${ACTIVE_RECORDS} and _jsi_stage_value eq ${stageId}` },
    'Leer áreas de la etapa',
  );
  const rowByArea = new Map(rows.flatMap((r) => (r._jsi_area_value ? [[r._jsi_area_value, r.jsi_stageareaid] as const] : [])));
  const { toAdd, toRemove } = diffSets(new Set(rowByArea.keys()), new Set(areaIds));

  await Promise.all([
    ...toAdd.map(async (areaId) => {
      const record = {
        'jsi_Stage@odata.bind': bind('jsi_stages', stageId),
        'jsi_Area@odata.bind': bind('jsi_areas', areaId),
      } as NewStageAreaRecord;
      unwrap(await Jsi_stageareasService.create(record), 'Asignar área a la etapa');
    }),
    ...toRemove.map((areaId) => Jsi_stageareasService.delete(rowByArea.get(areaId)!)),
  ]);
}

/** Crea una etapa (sin `stageId`) o actualiza una existente, junto con sus áreas. */
export async function saveStage(input: StageInput, stageId?: string): Promise<void> {
  const fields = {
    jsi_name: input.name.trim(),
    jsi_order: input.order,
    jsi_scope: input.isGeneral ? STAGE_SCOPE.General : STAGE_SCOPE.AreaSpecific,
    jsi_businessdaysdeadline: input.businessDays,
  };

  let id: string;
  if (stageId) {
    unwrap(await Jsi_stagesService.update(stageId, fields as StageChanges), 'Actualizar etapa');
    id = stageId;
  } else {
    id = unwrap(await Jsi_stagesService.create(fields as NewStageRecord), 'Crear etapa').jsi_stageid;
  }

  // Una etapa general aplica a todas las áreas: no necesita filas en jsi_stagearea.
  await syncStageAreas(id, input.isGeneral ? [] : input.areaIds);
}
