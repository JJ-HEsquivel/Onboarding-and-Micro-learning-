#!/usr/bin/env node
// =============================================================================
// enable-auditing.mjs
// Activa la AUDITORIA de Dataverse para las tablas del sistema: cada alta,
// cambio y baja queda registrada con quien la hizo, cuando, y el valor anterior
// y el nuevo de cada columna. Cumple "Requisitos de almacenamiento de logs"
// (politica JLS-EIS-PO12: logs por un minimo de 30 dias).
//
// La auditoria tiene dos interruptores:
//   1) Del ENTORNO (organizacion): sin el, ninguna tabla audita. Lo cambia un
//      administrador del entorno; este script solo lo hace con --org.
//   2) De cada TABLA: este script lo activa en todas las tablas de schema.mjs.
//
// USO (dentro de dataverse-schema-tool):
//   npm run audit:dry-run   (solo muestra el estado y lo que cambiaria)
//   npm run audit           (activa la auditoria de las tablas)
//   npm run audit:org       (ademas activa la del entorno y su retencion)
//
// Los registros se ven en make.powerapps.com > tabla > un registro > Historial
// de auditoria, o en el Centro de administracion > Auditoria.
// =============================================================================
import { CONFIG, TABLES } from './schema.mjs';
import { connect, getDataverseUrl } from './lib/dataverse-client.mjs';

const DRY_RUN = process.argv.includes('--dry-run');
const INCLUDE_ORG = process.argv.includes('--org');
const DATAVERSE_URL = getDataverseUrl();

console.log('==================================================================');
console.log(' Onboarding and Micro-learning · Auditoria de Dataverse');
console.log(` Entorno: ${DATAVERSE_URL}`);
console.log(` Modo:    ${DRY_RUN ? 'DRY-RUN (no se cambia nada)' : 'EJECUCION REAL'}${INCLUDE_ORG ? ' · incluye el entorno' : ''}`);
console.log('==================================================================\n');

async function main() {
  const api = await connect(DATAVERSE_URL);
  const who = await api('GET', 'WhoAmI');
  console.log(`Conexion OK con Dataverse (UserId: ${who.UserId}).\n`);

  // 1) Entorno
  console.log('--- 1/2 Auditoria del entorno ---');
  const org = (await api('GET', 'organizations?$select=organizationid,isauditenabled,auditretentionperiodv2,isuseraccessauditenabled')).value[0];
  const retention = org.auditretentionperiodv2 === -1 ? 'para siempre' : `${org.auditretentionperiodv2} dias`;
  console.log(`   Auditoria: ${org.isauditenabled ? 'ACTIVA' : 'INACTIVA'} · retencion: ${retention} · accesos de usuarios: ${org.isuseraccessauditenabled ? 'si' : 'no'}`);

  const retentionOk = org.auditretentionperiodv2 === -1 || org.auditretentionperiodv2 >= 30;
  if (INCLUDE_ORG && (!org.isauditenabled || !retentionOk || !org.isuseraccessauditenabled)) {
    if (DRY_RUN) {
      console.log(`   [se activaria] auditoria del entorno, retencion de ${CONFIG.auditRetentionDays} dias y registro de accesos`);
    } else {
      await api('PATCH', `organizations(${org.organizationid})`, {
        isauditenabled: true,
        auditretentionperiodv2: CONFIG.auditRetentionDays,
        isuseraccessauditenabled: true,
      });
      console.log(`   [activada] auditoria del entorno · retencion ${CONFIG.auditRetentionDays} dias · registro de accesos`);
    }
  } else if (!org.isauditenabled) {
    console.log('   ATENCION: sin la auditoria del entorno las tablas no registran nada.');
    console.log('   Ejecute "npm run audit:org" (requiere ser administrador del entorno) o pidaselo al administrador.');
  } else if (!retentionOk) {
    console.log('   ATENCION: la retencion es menor a 30 dias (politica JLS-EIS-PO12). Ejecute "npm run audit:org".');
  }

  // 2) Tablas
  console.log('\n--- 2/2 Auditoria de cada tabla ---');
  let changed = 0;
  for (const table of TABLES) {
    const logical = table.schemaName.toLowerCase();
    // Se lee la definicion COMPLETA: para cambiarla, Dataverse pide reenviarla entera (PUT).
    const definition = await api('GET', `EntityDefinitions(LogicalName='${logical}')`);
    if (definition.IsAuditEnabled?.Value) {
      console.log(`   [ya auditada] ${logical}`);
      continue;
    }
    if (DRY_RUN) {
      console.log(`   [se activaria] ${logical}`);
      continue;
    }
    definition.IsAuditEnabled = { ...definition.IsAuditEnabled, Value: true };
    // MergeLabels: conserva los nombres visibles en otros idiomas.
    await api('PUT', `EntityDefinitions(${definition.MetadataId})`, definition, { 'MSCRM.MergeLabels': 'true' });
    console.log(`   [activada]    ${logical}`);
    changed++;
  }

  if (!DRY_RUN && changed > 0) {
    console.log('\n[publish] Publicando cambios...');
    await api('POST', 'PublishAllXml', {});
    console.log('[publish] Listo.');
  }

  console.log('\n==================================================================');
  console.log(DRY_RUN ? ' DRY-RUN finalizado. No se modifico Dataverse.' : ` Finalizado. Tablas activadas ahora: ${changed}`);
  console.log('==================================================================');
}

main().catch((e) => {
  console.error('\n[ERROR FATAL]', e.message);
  process.exit(1);
});
