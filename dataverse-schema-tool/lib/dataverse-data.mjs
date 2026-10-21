// =============================================================================
// lib/dataverse-data.mjs
// Operaciones sobre REGISTROS (no sobre el esquema) reutilizadas por
// reset-data.mjs y seed-data.mjs: leer tablas completas, crear o actualizar
// (upsert) y borrar, resolviendo los nombres que exige la Web API.
// =============================================================================

/** Escapa un texto para usarlo dentro de comillas simples en un filtro OData. */
export const q = (value) => String(value).replace(/'/g, "''");

/** Ejecuta `task` sobre cada elemento con un máximo de `size` en paralelo. */
export async function inBatches(items, size, task) {
  const results = [];
  for (let i = 0; i < items.length; i += size) {
    results.push(...(await Promise.all(items.slice(i, i + size).map(task))));
  }
  return results;
}

/**
 * @param api      función devuelta por connect() (lib/dataverse-client.mjs)
 * @param dryRun   si es true, no escribe nada: solo informa lo que haría
 */
export function createDataStore(api, { dryRun = false } = {}) {
  const metaCache = {};

  /** Nombre del entity set, columna ID y propiedades de navegación de cada lookup. */
  async function getMeta(logical) {
    if (metaCache[logical]) return metaCache[logical];
    let def;
    try {
      def = await api('GET', `EntityDefinitions(LogicalName='${logical}')?$select=EntitySetName,PrimaryIdAttribute`);
    } catch (e) {
      if (e.status === 404) {
        throw new Error(`La tabla "${logical}" no existe en Dataverse. Ejecute primero "npm run create".`);
      }
      throw e;
    }
    const rel = await api(
      'GET',
      `EntityDefinitions(LogicalName='${logical}')/ManyToOneRelationships?$select=ReferencingAttribute,ReferencingEntityNavigationPropertyName`,
    );
    const nav = {};
    for (const r of rel.value) nav[r.ReferencingAttribute] = r.ReferencingEntityNavigationPropertyName;
    metaCache[logical] = { set: def.EntitySetName, pk: def.PrimaryIdAttribute, nav };
    return metaCache[logical];
  }

  /** Todas las filas de una tabla (sigue la paginación de Dataverse). */
  async function fetchAll(logical, { select, filter } = {}) {
    const m = await getMeta(logical);
    const params = [`$select=${[m.pk, ...(select ?? [])].join(',')}`];
    if (filter) params.push(`$filter=${encodeURIComponent(filter)}`);
    let page = await api('GET', `${m.set}?${params.join('&')}`, undefined, { Prefer: 'odata.maxpagesize=5000' });
    const rows = [...page.value];
    while (page['@odata.nextLink']) {
      page = await api('GET', page['@odata.nextLink'], undefined, { Prefer: 'odata.maxpagesize=5000' });
      rows.push(...page.value);
    }
    return rows;
  }

  /** Arma el cuerpo de un registro agregando los lookups como "@odata.bind". */
  async function withLookups(logical, payload, lookups) {
    const m = await getMeta(logical);
    const body = { ...payload };
    for (const l of lookups) {
      const parent = await getMeta(l.target);
      const navName = m.nav[l.attr];
      if (!navName) throw new Error(`No existe la relación de la columna ${logical}.${l.attr}. Ejecute "npm run create".`);
      body[`${navName}@odata.bind`] = `/${parent.set}(${l.id})`;
    }
    return body;
  }

  /**
   * Crea o actualiza UN registro buscándolo con `filter`. Nunca duplica.
   * @returns {{ id: string, action: 'create' | 'update' }}
   */
  async function upsert(logical, filter, payload, lookups = []) {
    const m = await getMeta(logical);
    const found = await api('GET', `${m.set}?$select=${m.pk}&$filter=${encodeURIComponent(filter)}&$top=2`);
    if (found.value.length > 1) throw new Error(`Hay más de un registro en ${logical} que coincide con: ${filter}`);
    const existing = found.value[0]?.[m.pk];

    if (dryRun) return { id: existing ?? `dryrun-${logical}-${Math.random().toString(16).slice(2)}`, action: existing ? 'update' : 'create' };

    const body = await withLookups(logical, payload, lookups);
    if (existing) {
      await api('PATCH', `${m.set}(${existing})`, body, { 'If-Match': '*' });
      return { id: existing, action: 'update' };
    }
    const created = await api('POST', `${m.set}?$select=${m.pk}`, body, { Prefer: 'return=representation' });
    return { id: created[m.pk], action: 'create' };
  }

  /** Crea un registro sin buscar antes (para hijos que se reemplazan completos). */
  async function create(logical, payload, lookups = []) {
    const m = await getMeta(logical);
    if (dryRun) return `dryrun-${logical}`;
    const body = await withLookups(logical, payload, lookups);
    const created = await api('POST', `${m.set}?$select=${m.pk}`, body, { Prefer: 'return=representation' });
    return created[m.pk];
  }

  async function remove(logical, id) {
    const m = await getMeta(logical);
    if (dryRun) return;
    await api('DELETE', `${m.set}(${id})`);
  }

  /** Deja vacío un lookup (ej. jsi_person.jsi_manager) para poder borrar el registro al que apunta. */
  async function clearLookup(logical, id, attr) {
    const m = await getMeta(logical);
    if (dryRun) return;
    await api('DELETE', `${m.set}(${id})/${m.nav[attr]}/$ref`);
  }

  async function count(logical) {
    return (await fetchAll(logical)).length;
  }

  return { getMeta, fetchAll, upsert, create, remove, clearLookup, count, dryRun };
}
