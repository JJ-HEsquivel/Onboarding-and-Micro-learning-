#!/usr/bin/env node
// =============================================================================
// migrate-contact-to-person.mjs  (se ejecuta UNA sola vez)
// Prepara el entorno para pasar la persona de la tabla estandar "contact" a la
// tabla propia "jsi_person". Solo borra DATOS (no toca tablas ni columnas):
//
//   1) Vacia las tablas cuyos registros apuntan a una persona (y sus hijos):
//      roles, inducciones, documentos y examenes asignados, intentos,
//      respuestas, evidencias y avisos. Son datos de prueba.
//   2) Borra las personas que creo la app en "contact" (las que tienen
//      jsi_area). Los contactos de otras apps del entorno NO se tocan.
//
// El catalogo (areas, etapas, documentos, evaluaciones y preguntas) se CONSERVA:
// no apunta a personas.
//
// ORDEN COMPLETO DE LA MIGRACION (dentro de dataverse-schema-tool):
//   1. npm run migrate:person       <- este script
//   2. npm run remove-columns       borra los lookups viejos hacia contact
//   3. npm run create               crea jsi_person y los lookups nuevos
//   4. npm run seed:people          crea las personas base y sus roles
// =============================================================================
import readline from 'node:readline/promises';
import { connect, getDataverseUrl } from './lib/dataverse-client.mjs';
import { createDataStore, inBatches } from './lib/dataverse-data.mjs';

const DRY_RUN = process.argv.includes('--dry-run');
const DATAVERSE_URL = getDataverseUrl();

// Primero los hijos y despues los padres (las relaciones son "Restrict").
const PERSON_TABLES = [
  'jsi_questionresponse',
  'jsi_assessmentattempt',
  'jsi_assessmentassignment',
  'jsi_evidence',
  'jsi_documentassignment',
  'jsi_notification',
  'jsi_onboarding',
  'jsi_roleassignment',
];

console.log('==================================================================');
console.log(' Onboarding and Micro-learning · Migracion contact -> jsi_person (datos)');
console.log(` Entorno: ${DATAVERSE_URL}`);
console.log(` Modo:    ${DRY_RUN ? 'DRY-RUN (no se borra nada)' : 'EJECUCION REAL'}`);
console.log('==================================================================\n');

async function confirm() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question('Esto BORRA los datos listados arriba y no se puede deshacer.\nEscriba MIGRAR para continuar: ');
  rl.close();
  return answer.trim() === 'MIGRAR';
}

/** true si contact todavia tiene la columna jsi_area (es decir, la migracion de esquema no se hizo). */
async function contactHasAppColumns(api) {
  try {
    await api('GET', "EntityDefinitions(LogicalName='contact')/Attributes(LogicalName='jsi_area')?$select=LogicalName");
    return true;
  } catch (e) {
    if (e.status === 404) return false;
    throw e;
  }
}

async function main() {
  const api = await connect(DATAVERSE_URL);
  const who = await api('GET', 'WhoAmI');
  console.log(`Conexion OK con Dataverse (UserId: ${who.UserId}).\n`);
  const store = createDataStore(api, { dryRun: DRY_RUN });

  if (!(await contactHasAppColumns(api))) {
    console.log('contact ya no tiene las columnas de la app: la migracion de datos ya se hizo.');
    console.log('Siga con: npm run remove-columns  ->  npm run create  ->  npm run seed:people');
    return;
  }

  // 1) Que se va a borrar
  const plan = [];
  for (const table of PERSON_TABLES) {
    const rows = await store.fetchAll(table);
    const { pk } = await store.getMeta(table);
    plan.push({ table, ids: rows.map((r) => r[pk]) });
  }
  // Personas de la app = contactos con area (los de otras apps no tienen jsi_area).
  const people = await store.fetchAll('contact', {
    select: ['fullname', 'emailaddress1', '_jsi_manager_value'],
    filter: '_jsi_area_value ne null',
  });

  console.log('Registros a borrar:');
  for (const { table, ids } of plan) console.log(`   ${table.padEnd(26)} ${String(ids.length).padStart(5)}`);
  console.log(`   ${'contact (personas de la app)'.padEnd(26)} ${String(people.length).padStart(5)}`);
  people.forEach((p) => console.log(`      - ${p.fullname ?? '(sin nombre)'} <${p.emailaddress1 ?? 'sin correo'}>`));
  console.log('\nSe conservan: el catalogo completo y los contactos de otras apps.');
  console.log('Las personas base (data/people.json) se vuelven a crear en jsi_person con "npm run seed:people".');

  if (DRY_RUN) {
    console.log('\nDRY-RUN finalizado. No se modifico Dataverse.');
    return;
  }
  if (!(await confirm())) {
    console.log('\nCancelado. No se borro nada.');
    return;
  }

  // 2) Borrar en orden
  console.log('');
  for (const { table, ids } of plan) {
    if (ids.length === 0) continue;
    await inBatches(ids, 10, (id) => store.remove(table, id));
    console.log(`   [vaciada] ${table} (${ids.length})`);
  }
  // Un contacto no se puede borrar mientras otro lo tenga como Manager: primero se quitan esas referencias.
  await inBatches(people.filter((p) => p._jsi_manager_value), 10, (p) => store.clearLookup('contact', p.contactid, 'jsi_manager'));
  await inBatches(people, 10, (p) => store.remove('contact', p.contactid));
  console.log(`   [borradas] personas de la app en contact (${people.length})`);

  console.log('\n==================================================================');
  console.log(' Datos migrados. Siga con:');
  console.log('   npm run remove-columns   (borra los lookups viejos hacia contact)');
  console.log('   npm run create           (crea jsi_person y los lookups nuevos)');
  console.log('   npm run seed:people      (crea las personas base y sus roles)');
  console.log('==================================================================');
}

main().catch((e) => {
  console.error('\n[ERROR FATAL]', e.message);
  process.exit(1);
});
