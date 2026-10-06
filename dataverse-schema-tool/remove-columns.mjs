#!/usr/bin/env node
// =============================================================================
// remove-columns.mjs
// Borra de Dataverse las columnas listadas en REMOVED_COLUMNS (schema.mjs).
// create-tables.mjs nunca borra nada; este script es el unico que lo hace.
//
// USO (dentro de la carpeta dataverse-schema-tool):
//   node remove-columns.mjs --dry-run   (solo muestra que borraria)
//   node remove-columns.mjs             (borra de verdad)
//
// ATENCION: borrar una columna borra tambien los datos que tenga. Es
// IDEMPOTENTE: si una columna ya no existe, la salta.
// =============================================================================
import { REMOVED_COLUMNS } from './schema.mjs';
import { connect, getDataverseUrl } from './lib/dataverse-client.mjs';

const DRY_RUN = process.argv.includes('--dry-run');
const DATAVERSE_URL = getDataverseUrl();

console.log('==================================================================');
console.log(' Onboarding and Micro-learning · Borrado de columnas obsoletas');
console.log(` Entorno: ${DATAVERSE_URL}`);
console.log(` Modo:    ${DRY_RUN ? 'DRY-RUN (no se borra nada)' : 'EJECUCION REAL'}`);
console.log('==================================================================\n');

async function main() {
  const api = await connect(DATAVERSE_URL);
  const who = await api('GET', 'WhoAmI');
  console.log(`Conexion OK con Dataverse (UserId: ${who.UserId}).\n`);

  const entitySets = {};
  let removed = 0;
  let failed = 0;

  for (const { table, column, reason } of REMOVED_COLUMNS) {
    const label = `${table}.${column}`;
    const attributePath = `EntityDefinitions(LogicalName='${table}')/Attributes(LogicalName='${column}')`;

    try {
      await api('GET', `${attributePath}?$select=LogicalName`);
    } catch (e) {
      if (e.status === 404) {
        console.log(`   [ya no existe] ${label}`);
        continue;
      }
      throw e;
    }

    // Cuantos registros tienen un valor en esa columna (se perderan al borrarla).
    entitySets[table] ??= (await api('GET', `EntityDefinitions(LogicalName='${table}')?$select=EntitySetName`)).EntitySetName;
    const withData = await api('GET', `${entitySets[table]}?$select=${column}&$filter=${column} ne null&$count=true&$top=1`);
    const count = withData['@odata.count'] ?? 0;
    const dataNote = count > 0 ? ` · ATENCION: ${count} registro(s) tienen datos en esta columna` : '';

    if (DRY_RUN) {
      console.log(`   [se BORRARIA] ${label}  (${reason})${dataNote}`);
      continue;
    }

    try {
      await api('DELETE', attributePath);
      console.log(`   [borrada]     ${label}${dataNote}`);
      removed++;
    } catch (e) {
      failed++;
      console.log(`   [ERROR]       ${label}: ${e.message}`);
      console.log('                 Si el error menciona dependencias, quita la columna de los formularios y');
      console.log('                 vistas de la tabla en make.powerapps.com y vuelve a ejecutar este script.');
    }
  }

  if (!DRY_RUN && removed > 0) {
    console.log('\n[publish] Publicando cambios...');
    await api('POST', 'PublishAllXml', {});
    console.log('[publish] Listo.');
  }

  console.log('\n==================================================================');
  console.log(DRY_RUN
    ? ' DRY-RUN finalizado. No se modifico Dataverse.'
    : ` Finalizado. Borradas: ${removed} · Con error: ${failed}`);
  console.log('==================================================================');
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error('\n[ERROR FATAL]', e.message);
  process.exit(1);
});
