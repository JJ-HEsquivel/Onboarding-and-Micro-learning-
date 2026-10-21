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
  // Personas de la app (jsi_person es una tabla propia: todas sus filas son de esta app).
  const people = await store.fetchAll('jsi_person', { select: ['jsi_email', 'jsi_fullname', '_jsi_manager_value'] });
  const peopleToDelete = people.filter((p) => !KEEP_EMAILS.has((p.jsi_email ?? '').toLowerCase()));
  const deleteIds = new Set(peopleToDelete.map((p) => p.jsi_personid));

  console.log('Registros a borrar:');
  for (const { table, ids } of plan) console.log(`   ${table.padEnd(26)} ${String(ids.length).padStart(5)}`);
  console.log(`   ${'jsi_person (personas)'.padEnd(26)} ${String(peopleToDelete.length).padStart(5)}`);
  peopleToDelete.forEach((p) => console.log(`      - ${p.jsi_fullname ?? '(sin nombre)'} <${p.jsi_email ?? 'sin correo'}>`));
  console.log(`\nSe conservan: ${people.length - peopleToDelete.length} persona(s) base y todas las áreas.`);

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
  const pointingToDeleted = people.filter((p) => p._jsi_manager_value && deleteIds.has(p._jsi_manager_value));
  await inBatches(pointingToDeleted, 10, (p) => store.clearLookup('jsi_person', p.jsi_personid, 'jsi_manager'));
  await inBatches(peopleToDelete, 10, (p) => store.remove('jsi_person', p.jsi_personid));
  console.log(`   [borradas] personas (${peopleToDelete.length})`);

  console.log('\n==================================================================');
  console.log(' Reinicio terminado. Ahora ejecute: npm run seed');
  console.log('==================================================================');
}

main().catch((e) => {
  console.error('\n[ERROR FATAL]', e.message);
  process.exit(1);
});
