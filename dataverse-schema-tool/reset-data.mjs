#!/usr/bin/env node
// =============================================================================
// reset-data.mjs
// Reinicia los DATOS del sistema (no toca tablas ni columnas):
//   - Borra todos los registros de inducción: inducciones, roles, asignaciones,
//     intentos, respuestas, evidencias, notificaciones, campañas y brechas.
//   - Borra el catálogo (etapas, documentos, evaluaciones, preguntas...) para
//     que seed-data.mjs lo vuelva a cargar limpio desde data/catalog.json.
//   - Borra a las personas de la app, EXCEPTO las de data/people.json.
//   - Conserva las áreas (las personas base las usan).
//
// USO (dentro de la carpeta dataverse-schema-tool):
//   npm run reset:dry-run    (solo cuenta lo que borraría)
//   npm run reset            (pide escribir REINICIAR y borra)
//   Después: npm run seed     (vuelve a cargar catálogo y personas base)
// =============================================================================
import fs from 'node:fs';
import readline from 'node:readline/promises';
import { connect, getDataverseUrl } from './lib/dataverse-client.mjs';
import { createDataStore, inBatches } from './lib/dataverse-data.mjs';

const DRY_RUN = process.argv.includes('--dry-run');
const DATAVERSE_URL = getDataverseUrl();
const KEEP_EMAILS = new Set(
  JSON.parse(fs.readFileSync(new URL('./data/people.json', import.meta.url), 'utf8')).people.map((p) => p.email.toLowerCase()),
);

// Orden de borrado: primero los hijos y después los padres (las relaciones son "Restrict").
const TABLES_TO_EMPTY = [
  'jsi_questionresponse',
  'jsi_assessmentattempt',
  'jsi_assessmentassignment',
  'jsi_evidence',
  'jsi_documentassignment',
  'jsi_notification',
  'jsi_campaigndelivery',
  'jsi_campaignarea',
  'jsi_campaign',
  'jsi_gap',
  'jsi_onboarding',
  'jsi_roleassignment',
  'jsi_answeroption',
  'jsi_question',
  'jsi_assessment',
  'jsi_documentversion',
  'jsi_documentarea',
  'jsi_document',
  'jsi_stagearea',
  'jsi_stage',
  'jsi_documentcategory',
];

console.log('==================================================================');
console.log(' Onboarding and Micro-learning · Reinicio de datos');
console.log(` Entorno: ${DATAVERSE_URL}`);
console.log(` Modo:    ${DRY_RUN ? 'DRY-RUN (no se borra nada)' : 'EJECUCION REAL'}`);
console.log('==================================================================\n');

async function confirm() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question('Esto BORRA los datos listados arriba y no se puede deshacer.\nEscriba REINICIAR para continuar: ');
  rl.close();
  return answer.trim() === 'REINICIAR';
}

async function main() {
  const api = await connect(DATAVERSE_URL);
  const who = await api('GET', 'WhoAmI');
  console.log(`Conexion OK con Dataverse (UserId: ${who.UserId}).\n`);
  const store = createDataStore(api, { dryRun: DRY_RUN });

  // 1) Qué se va a borrar
  const plan = [];
  for (const table of TABLES_TO_EMPTY) {
    const rows = await store.fetchAll(table);
    const { pk } = await store.getMeta(table);
    plan.push({ table, ids: rows.map((r) => r[pk]) });
  }
  // Personas de la app = contactos con área (las de otras apps de Dataverse no tienen jsi_area).
  const contacts = await store.fetchAll('contact', {
    select: ['emailaddress1', 'fullname', '_jsi_manager_value'],
    filter: '_jsi_area_value ne null',
  });
  const contactsToDelete = contacts.filter((c) => !KEEP_EMAILS.has((c.emailaddress1 ?? '').toLowerCase()));
  const deleteIds = new Set(contactsToDelete.map((c) => c.contactid));

  console.log('Registros a borrar:');
  for (const { table, ids } of plan) console.log(`   ${table.padEnd(26)} ${String(ids.length).padStart(5)}`);
  console.log(`   ${'contact (personas)'.padEnd(26)} ${String(contactsToDelete.length).padStart(5)}`);
  contactsToDelete.forEach((c) => console.log(`      - ${c.fullname ?? '(sin nombre)'} <${c.emailaddress1 ?? 'sin correo'}>`));
  console.log(`\nSe conservan: ${contacts.length - contactsToDelete.length} persona(s) base y todas las áreas.`);

  if (DRY_RUN) {
    console.log('\nDRY-RUN finalizado. No se modifico Dataverse.');
    return;
  }
  if (!(await confirm())) {
    console.log('\nCancelado. No se borro nada.');
    return;
  }

  // 2) Borrar tablas en orden
  console.log('');
  for (const { table, ids } of plan) {
    if (ids.length === 0) continue;
    await inBatches(ids, 10, (id) => store.remove(table, id));
    console.log(`   [vaciada] ${table} (${ids.length})`);
  }

  // 3) Personas: primero se quitan las referencias "Manager" hacia quienes se van a borrar
  const pointingToDeleted = contacts.filter((c) => c._jsi_manager_value && deleteIds.has(c._jsi_manager_value));
  await inBatches(pointingToDeleted, 10, (c) => store.clearLookup('contact', c.contactid, 'jsi_manager'));
  await inBatches(contactsToDelete, 10, (c) => store.remove('contact', c.contactid));
  console.log(`   [borradas] personas (${contactsToDelete.length})`);

  console.log('\n==================================================================');
  console.log(' Reinicio terminado. Ahora ejecute: npm run seed');
  console.log('==================================================================');
}

main().catch((e) => {
  console.error('\n[ERROR FATAL]', e.message);
  process.exit(1);
});
