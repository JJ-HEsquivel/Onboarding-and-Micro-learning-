#!/usr/bin/env node
// =============================================================================
// seed-data.mjs
// Carga los registros DEFINIDOS (catalogos) en Dataverse:
//   jsi_area, jsi_stage, jsi_stagearea, jsi_document
//
// USO (dentro de la carpeta dataverse-schema-tool):
//   node seed-data.mjs --dry-run     (solo muestra que haria, no escribe nada)
//   node seed-data.mjs               (carga los datos de verdad)
//
// Es IDEMPOTENTE: se puede ejecutar varias veces. Si un registro ya existe
// (se busca por nombre o codigo) lo ACTUALIZA; si no existe lo CREA. Nunca duplica.
// No guarda ni imprime ningun token.
// =============================================================================
import 'dotenv/config';
import { PublicClientApplication, LogLevel } from '@azure/msal-node';
import { execSync } from 'node:child_process';

// =============================================================================
// ===================  DATOS A CARGAR (edita aqui si hace falta)  =============
// =============================================================================

// Valores de los Choice (segun schema.mjs)
const SCOPE = { General: 100000000, AreaSpecific: 100000001 };
const CRITICALITY = { High: 100000000, Medium: 100000001, Low: 100000002 };
const DOC_STATUS = { Current: 100000000, Updated: 100000001, Draft: 100000002 };

// --- Areas: nombres tomados del panel "Estado de la induccion por area" -------
// OJO: el "code" NO viene en tus documentos; es obligatorio en la tabla, asi que
// puse una abreviatura. Cambiala aqui si tu empresa usa otros codigos.
const AREAS = [
  { name: 'Engineering',         code: 'ENG' },
  { name: 'Quality Control',     code: 'QC'  },
  { name: 'Project Management',  code: 'PM'  },
  { name: 'People & Culture',    code: 'PC'  },
  { name: 'Finance',             code: 'FIN' },
  { name: 'IT & Infrastructure', code: 'ITI' },
];

// --- Etapas: segun el PDF "Contenido Jala Connections" y el modal ------------
const STAGES = [
  { key: 's1',    name: 'Etapa 1 · Políticas Fundamentales',                   order: 1, days: 5,    scope: SCOPE.General },
  { key: 's2',    name: 'Etapa 2 · Políticas Fundamentales',                   order: 2, days: 5,    scope: SCOPE.General },
  { key: 's3eng', name: 'Etapa 3 · Documentación específica: Ingeniería',      order: 3, days: null, scope: SCOPE.AreaSpecific },
  { key: 's3adm', name: 'Etapa 3 · Documentación específica: Administración',  order: 3, days: null, scope: SCOPE.AreaSpecific },
];

// --- A que areas se asigna cada etapa de tipo "AreaSpecific" ------------------
// Ingenieria -> Engineering (el prototipo lo muestra asi).
// Administracion -> NO esta definido en tus documentos. Dejalo vacio [] o escribe
// los nombres exactos de areas de la lista AREAS, por ejemplo: ['Finance'].
const ADMIN_STAGE_AREAS = [];
const STAGE_AREAS = [
  { stage: 's3eng', area: 'Engineering' },
  ...ADMIN_STAGE_AREAS.map((a) => ({ stage: 's3adm', area: a })),
];

// --- Documentos --------------------------------------------------------------
// code / title / minutos: tomados del prototipo (capturas).
// pages / owner: tomados del Excel de documentos.
// dot: true = el documento tiene el punto naranja en el prototipo (se carga como
//      criticidad High; los demas como Medium). Ver nota en la guia.
const EIS = 'Enterprise Information Security';
const TT  = 'Technology and Transformation';
const PAC = 'Procurement and Asset Control';
const DOCS = [
  // ---- Etapa 1 ----
  { code: 'POL-TI-001',  title: 'BYOD Computadores - Política (ESP-ENG)',                                  stage: 's1', pages: 3,  min: 8,    owner: EIS, dot: true  },
  { code: 'POL-TI-002',  title: 'BYOD Tablets y dispositivos móviles - Política (ESP-ENG)',                stage: 's1', pages: 1,  min: 4,    owner: EIS, dot: true  },
  { code: 'POL-TI-003',  title: 'Control de Software y Hardware - Política (ESP-ENG)',                     stage: 's1', pages: 2,  min: 6,    owner: EIS, dot: false },
  { code: 'POL-SEG-004', title: 'Etiquetado de Datos e Información - Política',                            stage: 's1', pages: 4,  min: 10,   owner: EIS, dot: false },
  { code: 'POL-OPS-005', title: 'Uso correcto de bienes y servicios de la organización - Política',        stage: 's1', pages: 5,  min: 12,   owner: EIS, dot: false },
  { code: 'POL-TI-006',  title: 'Software permitido - Política (ESP - ENG)',                               stage: 's1', pages: 2,  min: 6,    owner: EIS, dot: false },
  { code: 'POL-SEG-007', title: 'Seguridad de la Información - Política (ESP - ENG)',                      stage: 's1', pages: 3,  min: 8,    owner: EIS, dot: true  },
  // ---- Etapa 2 ----
  { code: 'POL-DAT-008', title: 'Inteligencia Artificial - Política (ESP-ENG)',                            stage: 's2', pages: 3,  min: 8,    owner: EIS, dot: true  },
  { code: 'POL-SEG-009', title: 'Protección de Contraseñas - Política (ESP - ENG)',                        stage: 's2', pages: 1,  min: 4,    owner: EIS, dot: true  },
  { code: 'POL-DAT-010', title: 'Protección y Privacidad de Datos e Información - Política (ESP - ENG)',   stage: 's2', pages: 4,  min: 10,   owner: EIS, dot: true  },
  { code: 'POL-SEG-011', title: 'Uso de internet - Política (ESP - ENG)',                                  stage: 's2', pages: 2,  min: 6,    owner: EIS, dot: false },
  { code: 'POL-DAT-012', title: 'Uso de dispositivos de almacenamiento - Política (ESP-ENG)',              stage: 's2', pages: 1,  min: 4,    owner: TT,  dot: true  },
  // ---- Etapa 3 · Ingenieria ----
  { code: 'POL-ING-013', title: 'Desarrollo Seguro - Política',                                            stage: 's3eng', pages: 2, min: 6, owner: EIS,           dot: true },
  { code: 'POL-ING-014', title: 'Customer Engineering Confidential Information - Policy',                  stage: 's3eng', pages: 3, min: 8, owner: 'Engineering', dot: true },
  // ---- Etapa 3 · Administracion ----
  // Estos 2 NO aparecen en el prototipo: codigo y criticidad son valores por defecto
  // (campos obligatorios). Minutos de lectura: no definidos -> se dejan vacios.
  { code: 'MAN-ADM-015', title: 'Gestion de activos - Manual',                                             stage: 's3adm', pages: 15, min: null, owner: PAC, dot: false },
  { code: 'MAN-ADM-016', title: 'Compra de bienes y servicios - Manual (ESP-ENG)',                         stage: 's3adm', pages: 22, min: null, owner: PAC, dot: false },
];
const DOC_VERSION = '1.0';   // el prototipo muestra "v1.0"

// =============================================================================
// ===================  MOTOR (no necesitas editar de aqui en adelante)  =======
// =============================================================================
const DRY_RUN = process.argv.includes('--dry-run');
const API_VERSION = 'v9.2';

if (!process.env.DATAVERSE_URL) {
  console.error('\n[ERROR] Falta DATAVERSE_URL en tu archivo .env (carpeta dataverse-schema-tool).\n');
  process.exit(1);
}
const DATAVERSE_URL = process.env.DATAVERSE_URL.replace(/\/+$/, '');
const API = `${DATAVERSE_URL}/api/data/${API_VERSION}`;

console.log('==================================================================');
console.log(' Onboarding and Micro-learning · Carga de datos definidos');
console.log(` Entorno: ${DATAVERSE_URL}`);
console.log(` Modo:    ${DRY_RUN ? 'DRY-RUN (no se escribe nada)' : 'EJECUCION REAL'}`);
console.log('==================================================================\n');

// ---- Autenticacion (misma que create-tables.mjs) -----------------------------
const DEFAULT_PUBLIC_CLIENT_ID = '51f81489-12ee-4a9e-aaae-a2591f45987d';
const AUTH_MODE = (process.env.AUTH_MODE || 'device').toLowerCase();

async function getTokenWithDeviceCode() {
  const pca = new PublicClientApplication({
    auth: {
      clientId: process.env.AZURE_CLIENT_ID || DEFAULT_PUBLIC_CLIENT_ID,
      authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID || 'organizations'}`,
    },
    system: { loggerOptions: { loggerCallback: () => {}, logLevel: LogLevel.Error } },
  });
  const result = await pca.acquireTokenByDeviceCode({
    scopes: [`${DATAVERSE_URL}/user_impersonation`],
    deviceCodeCallback: (response) => {
      console.log('\n--- INICIO DE SESION REQUERIDO ---');
      console.log(response.message);
      console.log('-----------------------------------\n');
    },
  });
  console.log(`Sesion iniciada como: ${result.account?.username ?? '(cuenta autenticada)'}\n`);
  return result.accessToken;
}
function getTokenWithAzureCli() {
  try {
    const out = execSync(`az account get-access-token --resource ${DATAVERSE_URL} --query accessToken -o tsv`, {
      encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'],
    });
    const token = out.trim();
    if (!token) throw new Error('az no devolvio token');
    return token;
  } catch (e) {
    throw new Error('No se pudo obtener el token con Azure CLI: ' + (e.stderr?.toString().trim() || e.message));
  }
}
const getAccessToken = async () => (AUTH_MODE === 'azcli' ? getTokenWithAzureCli() : getTokenWithDeviceCode());

// ---- HTTP --------------------------------------------------------------------
let TOKEN = '';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(method, path, body, extraHeaders = {}) {
  const url = `${API}/${path}`;
  for (let attempt = 1; attempt <= 5; attempt++) {
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0',
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json; charset=utf-8' } : {}),
        ...extraHeaders,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if ((res.status === 429 || res.status === 503) && attempt < 5) {
      await sleep((Number(res.headers.get('retry-after')) || 2 * attempt) * 1000);
      continue;
    }
    const text = await res.text();
    if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${text}`);
    return text ? JSON.parse(text) : null;
  }
}

// ---- Metadata: nombre del entity set, columna ID y propiedades de navegacion --
const META = {};
async function getMeta(logical) {
  if (META[logical]) return META[logical];
  let def;
  try {
    def = await api('GET', `EntityDefinitions(LogicalName='${logical}')?$select=EntitySetName,PrimaryIdAttribute`);
  } catch (e) {
    if (/-> 404/.test(e.message)) {
      throw new Error(`La tabla "${logical}" no existe en Dataverse. Ejecuta primero "npm run create" (crear tablas) y espera a que termine sin errores.`);
    }
    throw e;
  }
  const rel = await api('GET', `EntityDefinitions(LogicalName='${logical}')/ManyToOneRelationships?$select=ReferencingAttribute,ReferencingEntityNavigationPropertyName`);
  const nav = {};
  for (const r of rel.value) nav[r.ReferencingAttribute] = r.ReferencingEntityNavigationPropertyName;
  META[logical] = { set: def.EntitySetName, pk: def.PrimaryIdAttribute, nav };
  return META[logical];
}

const q = (v) => String(v).replace(/'/g, "''");

// Crea o actualiza UN registro. Devuelve { id, action }.
async function upsert(logical, filter, payload, label, lookups = []) {
  const m = await getMeta(logical);
  const found = await api('GET', `${m.set}?$select=${m.pk}&$filter=${encodeURIComponent(filter)}&$top=2`);
  if (found.value.length > 1) throw new Error(`Hay mas de un registro que coincide en ${logical} (${label}). Revisa duplicados en Dataverse.`);
  const existing = found.value[0]?.[m.pk];

  if (DRY_RUN) {
    console.log(`   ${existing ? '[existe -> se ACTUALIZARIA]' : '[no existe -> se CREARIA]    '} ${label}`);
    return { id: existing || `dryrun-${label}`, action: existing ? 'update' : 'create' };
  }

  const body = { ...payload };
  for (const l of lookups) {
    const parent = await getMeta(l.target);
    const navName = m.nav[l.attr];
    if (!navName) throw new Error(`No se encontro la relacion de la columna ${logical}.${l.attr}. ¿Se crearon bien las relaciones (npm run create)?`);
    body[`${navName}@odata.bind`] = `/${parent.set}(${l.id})`;
  }

  if (existing) {
    await api('PATCH', `${m.set}(${existing})`, body, { 'If-Match': '*' });
    console.log(`   [actualizado] ${label}`);
    return { id: existing, action: 'update' };
  }
  const created = await api('POST', `${m.set}?$select=${m.pk}`, body, { Prefer: 'return=representation' });
  console.log(`   [creado]      ${label}`);
  return { id: created[m.pk], action: 'create' };
}

async function count(logical) {
  const m = await getMeta(logical);
  const r = await api('GET', `${m.set}?$select=${m.pk}&$count=true&$top=1`);
  return r['@odata.count'];
}

// ---- Programa principal --------------------------------------------------------
async function main() {
  TOKEN = await getAccessToken();
  const who = await api('GET', 'WhoAmI');
  console.log(`Conexion OK con Dataverse (UserId: ${who.UserId}).\n`);

  // Validar que existan las 4 tablas antes de empezar
  for (const t of ['jsi_area', 'jsi_stage', 'jsi_stagearea', 'jsi_document']) await getMeta(t);

  const stats = { create: 0, update: 0 };
  const tally = (r) => { stats[r.action]++; return r; };

  // 1) Areas
  console.log('--- 1/4 Areas ---');
  const areaId = {};
  for (const a of AREAS) {
    const r = tally(await upsert('jsi_area', `jsi_name eq '${q(a.name)}'`, { jsi_name: a.name, jsi_code: a.code }, a.name));
    areaId[a.name] = r.id;
  }

  // 2) Etapas
  console.log('\n--- 2/4 Etapas ---');
  const stageId = {};
  for (const s of STAGES) {
    const payload = { jsi_name: s.name, jsi_order: s.order, jsi_scope: s.scope };
    if (s.days !== null) payload.jsi_businessdaysdeadline = s.days;
    const r = tally(await upsert('jsi_stage', `jsi_name eq '${q(s.name)}'`, payload, s.name));
    stageId[s.key] = r.id;
  }

  // 3) Etapa <-> Area
  console.log('\n--- 3/4 Etapa-Area ---');
  if (STAGE_AREAS.length === 0) console.log('   (ninguna)');
  for (const sa of STAGE_AREAS) {
    if (!areaId[sa.area]) throw new Error(`El area "${sa.area}" de STAGE_AREAS no esta en la lista AREAS.`);
    const stageName = STAGES.find((s) => s.key === sa.stage).name;
    const filter = DRY_RUN && String(stageId[sa.stage]).startsWith('dryrun')
      ? `jsi_name eq 'dryrun-no-existe'`
      : `_jsi_stage_value eq ${stageId[sa.stage]} and _jsi_area_value eq ${areaId[sa.area]}`;
    tally(await upsert('jsi_stagearea', filter, {}, `${stageName}  ->  ${sa.area}`, [
      { attr: 'jsi_stage', target: 'jsi_stage', id: stageId[sa.stage] },
      { attr: 'jsi_area', target: 'jsi_area', id: areaId[sa.area] },
    ]));
  }

  // 4) Documentos
  console.log('\n--- 4/4 Documentos ---');
  for (const d of DOCS) {
    const payload = {
      jsi_title: d.title,
      jsi_code: d.code,
      jsi_version: DOC_VERSION,
      jsi_criticality: d.dot ? CRITICALITY.High : CRITICALITY.Medium,
      jsi_status: DOC_STATUS.Current,
      jsi_mandatory: true,
      jsi_pagecount: d.pages,
      jsi_owningdepartment: d.owner,
    };
    if (d.min !== null) payload.jsi_readingminutes = d.min;
    tally(await upsert('jsi_document', `jsi_code eq '${q(d.code)}'`, payload, `${d.code}  ${d.title}`, [
      { attr: 'jsi_stage', target: 'jsi_stage', id: stageId[d.stage] },
    ]));
  }

  // Resumen
  console.log('\n==================================================================');
  if (DRY_RUN) {
    console.log(` DRY-RUN finalizado. Se crearian ${stats.create} y se actualizarian ${stats.update} registros.`);
    console.log(' No se modifico Dataverse.');
  } else {
    console.log(` Listo. Creados: ${stats.create} · Actualizados: ${stats.update}`);
    console.log('\n Verificacion (registros que hay ahora en Dataverse):');
    const expected = { jsi_area: AREAS.length, jsi_stage: STAGES.length, jsi_stagearea: STAGE_AREAS.length, jsi_document: DOCS.length };
    for (const t of Object.keys(expected)) {
      const n = await count(t);
      console.log(`   ${t.padEnd(15)} ${String(n).padStart(3)} registros (esperado en esta carga: ${expected[t]})${n >= expected[t] ? '  OK' : '  <-- REVISAR'}`);
    }
  }
  console.log('==================================================================');
}

main().catch((e) => {
  console.error('\n[ERROR FATAL]', e.message);
  process.exit(1);
});
