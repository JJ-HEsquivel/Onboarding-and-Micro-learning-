/**
 * Utilidades comunes para trabajar con los servicios generados de Dataverse.
 */
import type { IOperationResult } from '@microsoft/power-apps/data';
import type { IGetAllOptions } from '@/generated/models/CommonModels';

/** Filtro OData para traer solo registros activos (no desactivados). */
export const ACTIVE_RECORDS = 'statecode eq 0';

/** Límite de seguridad de páginas al leer todos los registros de una tabla. */
const MAX_PAGES = 50;

/**
 * Devuelve los datos de una operación o lanza un error legible si falló.
 * @param action Descripción de lo que se intentaba hacer (aparece en el mensaje de error).
 */
export function unwrap<T>(result: IOperationResult<T>, action: string): T {
  if (!result.success) {
    throw new Error(`${action}: ${result.error?.message ?? 'error desconocido'}`);
  }
  return result.data;
}

/**
 * Lee todas las páginas de una consulta (Dataverse devuelve los resultados por páginas).
 *
 * @example
 * const areas = await fetchAll((o) => Jsi_areasService.getAll(o), { select: ['jsi_name'] }, 'Leer áreas');
 */
export async function fetchAll<T>(
  getAll: (options: IGetAllOptions) => Promise<IOperationResult<T[]>>,
  options: IGetAllOptions,
  action: string,
): Promise<T[]> {
  const rows: T[] = [];
  let skipToken: string | undefined;
  let page = 0;

  do {
    const result = await getAll({ ...options, skipToken });
    rows.push(...unwrap(result, action));
    skipToken = result.skipToken;
    page++;
  } while (skipToken && page < MAX_PAGES);

  return rows;
}

/**
 * Valor para asignar una columna de búsqueda (lookup) al crear o actualizar un registro.
 *
 * @example
 * { 'jsi_Area@odata.bind': bind('jsi_areas', areaId) }  // → "/jsi_areas(<id>)"
 */
export function bind(entitySetName: string, id: string): string {
  return `/${entitySetName}(${id})`;
}
