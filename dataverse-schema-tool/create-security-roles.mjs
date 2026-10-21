#!/usr/bin/env node
// =============================================================================
// create-security-roles.mjs
// Crea (o actualiza) los roles de seguridad de security-roles.mjs en la unidad
// de negocio raiz y los agrega a la solucion. Es IDEMPOTENTE: deja cada rol con
// EXACTAMENTE los permisos de la matriz (ReplacePrivilegesRole).
//
// USO (dentro de dataverse-schema-tool):
//   npm run roles:dry-run   (muestra la matriz y lo que haria)
//   npm run roles           (crea o actualiza los roles)
//
// Despues, un administrador asigna a cada usuario su rol (y "Basic User") en el
// Centro de administracion de Power Platform > Entorno > Usuarios.
// =============================================================================
import { CONFIG } from './schema.mjs';
import { ROLE_DEPTH, SECURITY_ROLES } from './security-roles.mjs';
import { connect, getDataverseUrl } from './lib/dataverse-client.mjs';

const DRY_RUN = process.argv.includes('--dry-run');
const DATAVERSE_URL = getDataverseUrl();

const PRIVILEGE_BY_LETTER = { C: 'Create', R: 'Read', W: 'Write', D: 'Delete', A: 'Append', T: 'AppendTo' };

console.log('==================================================================');
console.log(' Onboarding and Micro-learning · Roles de seguridad de Dataverse');
console.log(` Entorno: ${DATAVERSE_URL}`);
console.log(` Modo:    ${DRY_RUN ? 'DRY-RUN (no se cambia nada)' : 'EJECUCION REAL'}`);
console.log('==================================================================\n');

/** "CRA" -> ['prvCreatejsi_evidence', 'prvReadjsi_evidence', 'prvAppendjsi_evidence'] */
function privilegeNames(table, letters) {
  return [...letters].map((letter) => {
    const action = PRIVILEGE_BY_LETTER[letter];
    if (!action) throw new Error(`Letra de permiso desconocida "${letter}" en ${table}.`);
    return `prv${action}${table}`;
  });
}

async function main() {
  const api = await connect(DATAVERSE_URL);
  const who = await api('GET', 'WhoAmI');
  console.log(`Conexion OK con Dataverse (UserId: ${who.UserId}).\n`);

  const rootUnit = (await api('GET', 'businessunits?$select=businessunitid,name&$filter=_parentbusinessunitid_value eq null')).value[0];
  console.log(`Unidad de negocio raiz: ${rootUnit.name}\n`);

  // Todos los privilegios de las tablas jsi_ (el nombre se compara sin distinguir mayusculas).
  const privileges = await api('GET', "privileges?$select=privilegeid,name&$filter=contains(name,'jsi_')");
  const privilegeId = new Map(privileges.value.map((p) => [p.name.toLowerCase(), p.privilegeid]));

  for (const role of SECURITY_ROLES) {
    console.log(`--- ${role.name} ---`);
    const wanted = Object.entries(role.privileges).flatMap(([table, letters]) => privilegeNames(table, letters));
    const missing = wanted.filter((name) => !privilegeId.has(name.toLowerCase()));
    if (missing.length > 0) {
      throw new Error(`No existen estos privilegios (¿falta "npm run create"?): ${missing.join(', ')}`);
    }
    for (const [table, letters] of Object.entries(role.privileges)) console.log(`   ${table.padEnd(26)} ${letters}`);

    const existing = (await api('GET', `roles?$select=roleid&$filter=name eq '${role.name}' and _businessunitid_value eq ${rootUnit.businessunitid}`)).value[0];
    if (DRY_RUN) {
      console.log(`   => ${existing ? 'se actualizaria' : 'se crearia'} con ${wanted.length} permisos (alcance ${ROLE_DEPTH})\n`);
      continue;
    }

    const roleId = existing?.roleid ?? (await api('POST', 'roles?$select=roleid', {
      name: role.name,
      description: role.description,
      'businessunitid@odata.bind': `/businessunits(${rootUnit.businessunitid})`,
    }, { Prefer: 'return=representation' })).roleid;

    await api('POST', `roles(${roleId})/Microsoft.Dynamics.CRM.ReplacePrivilegesRole`, {
      Privileges: wanted.map((name) => ({
        PrivilegeId: privilegeId.get(name.toLowerCase()),
        Depth: ROLE_DEPTH,
        BusinessUnitId: rootUnit.businessunitid,
      })),
    });

    try {
      await api('POST', 'AddSolutionComponent', {
        ComponentId: roleId,
        ComponentType: 20, // Role
        SolutionUniqueName: CONFIG.solutionUniqueName,
        AddRequiredComponents: false,
      });
    } catch (e) {
      console.log(`   (aviso) no se pudo agregar a la solucion: ${e.message}`);
    }
    console.log(`   => ${existing ? 'actualizado' : 'creado'} con ${wanted.length} permisos\n`);
  }

  console.log('==================================================================');
  console.log(DRY_RUN ? ' DRY-RUN finalizado. No se modifico Dataverse.' : ' Roles listos. Asignelos a los usuarios en el Centro de administracion.');
  console.log('==================================================================');
}

main().catch((e) => {
  console.error('\n[ERROR FATAL]', e.message);
  process.exit(1);
});
