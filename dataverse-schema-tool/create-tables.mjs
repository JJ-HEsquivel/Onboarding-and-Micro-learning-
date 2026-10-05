#!/usr/bin/env node
// =============================================================================
// create-tables.mjs
// Motor generico que lee schema.mjs y crea/actualiza tablas, columnas y
// relaciones en Microsoft Dataverse usando la Web API (Dataverse Metadata).
//
// USO:
//   node create-tables.mjs --dry-run     (solo muestra que haria, no cambia nada)
//   node create-tables.mjs                (ejecuta los cambios de verdad)
//
// No guarda ni imprime ningun token, contrasena o secreto.
// =============================================================================
import 'dotenv/config';
import { PublicClientApplication, LogLevel } from '@azure/msal-node';
import { execSync } from 'node:child_process';
import { CONFIG, TABLES, TABLE_EXTENSIONS } from './schema.mjs';

const DRY_RUN = process.argv.includes('--dry-run');
const API_VERSION = 'v9.2';

// -----------------------------------------------------------------------------
// 0. Validacion de configuracion (.env)
// -----------------------------------------------------------------------------
const REQUIRED_ENV = ['DATAVERSE_URL'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`\n[ERROR] Falta la variable de entorno ${key} en tu archivo .env`);
    console.error('Copia .env.example a .env y completa los valores (ver README.md).\n');
    process.exit(1);
  }
}
const DATAVERSE_URL = process.env.DATAVERSE_URL.replace(/\/+$/, '');
const API = `${DATAVERSE_URL}/api/data/${API_VERSION}`;

console.log('==================================================================');
console.log(` Onboarding and Micro-learning · Dataverse schema tool`);
console.log(` Entorno: ${DATAVERSE_URL}`);
console.log(` Modo:    ${DRY_RUN ? 'DRY-RUN (no se escribe nada)' : 'EJECUCION REAL'}`);
console.log('==================================================================\n');

// -----------------------------------------------------------------------------
// 1. Autenticacion interactiva (Device Code Flow) — sin secretos, sin password
// -----------------------------------------------------------------------------
// Client ID publico publicado por Microsoft para ejecutar scripts contra Dataverse
// (https://learn.microsoft.com/power-apps/developer/data-platform/webapi/quick-start-console-app-csharp).
// NO requiere crear una App Registration propia. Se puede reemplazar con AZURE_CLIENT_ID en .env.
const DEFAULT_PUBLIC_CLIENT_ID = '51f81489-12ee-4a9e-aaae-a2591f45987d';
const AUTH_MODE = (process.env.AUTH_MODE || 'device').toLowerCase(); // 'device' | 'azcli'

async function getTokenWithDeviceCode() {
  const pca = new PublicClientApplication({
    auth: {
      clientId: process.env.AZURE_CLIENT_ID || DEFAULT_PUBLIC_CLIENT_ID,
      authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID || 'organizations'}`,
    },
    system: {
      loggerOptions: { loggerCallback: () => {}, logLevel: LogLevel.Error },
    },
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

// Alternativa sin App Registration: usa la sesion de Azure CLI ("az login").
function getTokenWithAzureCli() {
  try {
    const out = execSync(`az account get-access-token --resource ${DATAVERSE_URL} --query accessToken -o tsv`, {
      encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'],
    });
    const token = out.trim();
    if (!token) throw new Error('az no devolvio token');
    console.log('Token obtenido desde Azure CLI (az login).\n');
    return token;
  } catch (e) {
    throw new Error('No se pudo obtener el token con Azure CLI. Instala Azure CLI y ejecuta "az login" primero. Detalle: ' + (e.stderr?.toString().trim() || e.message));
  }
}

async function getAccessToken() {
  return AUTH_MODE === 'azcli' ? getTokenWithAzureCli() : getTokenWithDeviceCode();
}

let TOKEN = '';

async function callApi(method, path, body) {
  const url = path.startsWith('http') ? path : `${API}/${path}`;
  const headers = {
    Authorization: `Bearer ${TOKEN}`,
    'OData-MaxVersion': '4.0',
    'OData-Version': '4.0',
    Accept: 'application/json',
    'Content-Type': 'application/json; charset=utf-8',
  };
  if (method === 'POST') headers.Prefer = 'return=representation';

  let attempt = 0;
  while (true) {
    const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
    if (res.status === 429 && attempt < 3) { // throttling: reintenta
      const wait = Number(res.headers.get('Retry-After') || 3) * 1000;
      await new Promise((r) => setTimeout(r, wait));
      attempt++;
      continue;
    }
    if (res.status === 204) return null;
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) {
      const msg = data?.error?.message || res.statusText;
      const err = new Error(`${method} ${path} -> ${res.status} ${msg}`);
      err.status = res.status;
      err.body = data;
      throw err;
    }
    return data;
  }
}

const get = (path) => callApi('GET', path);
const post = (path, body) => callApi('POST', path, body);

// -----------------------------------------------------------------------------
// 2. Helpers de metadatos de Dataverse
// -----------------------------------------------------------------------------
const label = (text) => ({
  '@odata.type': 'Microsoft.Dynamics.CRM.Label',
  LocalizedLabels: [{ '@odata.type': 'Microsoft.Dynamics.CRM.LocalizedLabel', Label: text, LanguageCode: 1033 }],
  UserLocalizedLabel: { '@odata.type': 'Microsoft.Dynamics.CRM.LocalizedLabel', Label: text, LanguageCode: 1033 },
});

const requiredLevel = (value = 'None') => ({
  Value: value,
  CanBeChanged: true,
  ManagedPropertyLogicalName: 'canmodifyrequirementlevelsettings',
});

function buildPrimaryAttribute(col) {
  return {
    '@odata.type': 'Microsoft.Dynamics.CRM.StringAttributeMetadata',
    SchemaName: col.schemaName,
    DisplayName: label(col.displayName),
    RequiredLevel: requiredLevel('None'),
    MaxLength: col.maxLength || 100,
    FormatName: { Value: 'Text' },
    IsPrimaryName: true,
    ...(col.autoNumber ? { AutoNumberFormat: col.autoNumber } : {}),
  };
}

// Construye el AttributeMetadata segun el tipo declarado en schema.mjs
// (todo menos 'Lookup', que se resuelve como relacion aparte).
function buildAttribute(col) {
  const base = {
    SchemaName: col.schemaName,
    DisplayName: label(col.displayName),
    RequiredLevel: requiredLevel(col.requiredLevel || 'None'),
    Description: label(col.displayName),
  };
  switch (col.type) {
    case 'String':
      return { '@odata.type': 'Microsoft.Dynamics.CRM.StringAttributeMetadata', ...base, MaxLength: col.maxLength || 100 };
    case 'Memo':
      return { '@odata.type': 'Microsoft.Dynamics.CRM.MemoAttributeMetadata', ...base, MaxLength: col.maxLength || 2000 };
    case 'Integer':
      return { '@odata.type': 'Microsoft.Dynamics.CRM.IntegerAttributeMetadata', ...base, MinValue: -2147483648, MaxValue: 2147483647 };
    case 'Decimal':
      return { '@odata.type': 'Microsoft.Dynamics.CRM.DecimalAttributeMetadata', ...base, Precision: col.precision ?? 2, MinValue: -100000000000, MaxValue: 100000000000 };
    case 'Boolean':
      return {
        '@odata.type': 'Microsoft.Dynamics.CRM.BooleanAttributeMetadata', ...base,
        OptionSet: {
          '@odata.type': 'Microsoft.Dynamics.CRM.BooleanOptionSetMetadata',
          TrueOption: { Value: 1, Label: label(col.trueLabel || 'Yes') },
          FalseOption: { Value: 0, Label: label(col.falseLabel || 'No') },
        },
        DefaultValue: !!col.defaultValue,
      };
    case 'DateOnly':
      return { '@odata.type': 'Microsoft.Dynamics.CRM.DateTimeAttributeMetadata', ...base, Format: 'DateOnly', DateTimeBehavior: { Value: 'DateOnly' } };
    case 'DateTime':
      return { '@odata.type': 'Microsoft.Dynamics.CRM.DateTimeAttributeMetadata', ...base, Format: 'DateAndTime', DateTimeBehavior: { Value: 'UserLocal' } };
    case 'Picklist':
      return {
        '@odata.type': 'Microsoft.Dynamics.CRM.PicklistAttributeMetadata', ...base,
        OptionSet: {
          '@odata.type': 'Microsoft.Dynamics.CRM.OptionSetMetadata',
          IsGlobal: false,
          OptionSetType: 'Picklist',
          Options: col.options.map((o) => ({ Value: o.value, Label: label(o.label) })),
        },
      };
    case 'File':
      return { '@odata.type': 'Microsoft.Dynamics.CRM.FileAttributeMetadata', ...base, MaxSizeInKB: col.maxSizeKB || 20480 };
    default:
      throw new Error(`Tipo de columna no soportado por el motor: ${col.type} (columna ${col.schemaName})`);
  }
}

const logicalOf = (schemaName) => schemaName.toLowerCase();

// Dataverse espera 'OrganizationOwned' / 'UserOwned' (no 'Organization').
const OWNERSHIP_MAP = { Organization: 'OrganizationOwned', UserOwned: 'UserOwned', OrganizationOwned: 'OrganizationOwned' };

// -----------------------------------------------------------------------------
// 3. Chequeos de existencia
// -----------------------------------------------------------------------------
async function entityExists(logicalName) {
  const r = await get(`EntityDefinitions?$select=LogicalName,MetadataId&$filter=LogicalName eq '${logicalName}'`);
  return r.value[0] || null;
}
async function listAttributes(logicalName) {
  const r = await get(`EntityDefinitions(LogicalName='${logicalName}')/Attributes?$select=LogicalName`);
  return new Set(r.value.map((a) => a.LogicalName));
}
async function relationshipExists(schemaName) {
  const r = await get(`RelationshipDefinitions?$select=SchemaName&$filter=SchemaName eq '${schemaName}'`);
  return r.value.length > 0;
}

// -----------------------------------------------------------------------------
// 4. Publisher y Solution
// -----------------------------------------------------------------------------
async function ensurePublisherAndSolution() {
  let pub = (await get(`publishers?$select=publisherid&$filter=uniquename eq '${CONFIG.publisherUniqueName}'`)).value[0];
  if (!pub) {
    console.log(`[publisher] No existe "${CONFIG.publisherUniqueName}" -> ${DRY_RUN ? 'se crearia' : 'creando...'}`);
    if (!DRY_RUN) {
      pub = await post('publishers', {
        uniquename: CONFIG.publisherUniqueName,
        friendlyname: CONFIG.publisherFriendlyName,
        customizationprefix: CONFIG.publisherPrefix,
        customizationoptionvalueprefix: CONFIG.publisherOptionValuePrefix,
      });
    }
  } else {
    console.log(`[publisher] "${CONFIG.publisherUniqueName}" ya existe, se reutiliza.`);
  }

  let sol = (await get(`solutions?$select=solutionid&$filter=uniquename eq '${CONFIG.solutionUniqueName}'`)).value[0];
  if (!sol) {
    console.log(`[solution] No existe "${CONFIG.solutionUniqueName}" -> ${DRY_RUN ? 'se crearia' : 'creando...'}`);
    if (!DRY_RUN && pub) {
      sol = await post('solutions', {
        uniquename: CONFIG.solutionUniqueName,
        friendlyname: CONFIG.solutionFriendlyName,
        version: CONFIG.solutionVersion,
        'publisherid@odata.bind': `/publishers(${pub.publisherid})`,
      });
    }
  } else {
    console.log(`[solution] "${CONFIG.solutionUniqueName}" ya existe, se reutiliza.`);
  }
  console.log('');
}

async function addToSolution(componentId, componentType) {
  if (DRY_RUN || !componentId) return;
  try {
    await post('AddSolutionComponent', {
      ComponentId: componentId,
      ComponentType: componentType, // Entity=1, Relationship=10
      SolutionUniqueName: CONFIG.solutionUniqueName,
      AddRequiredComponents: false,
      DoNotIncludeSubcomponents: true,
    });
  } catch (e) {
    console.log(`   (aviso) no se pudo agregar a la solucion automaticamente: ${e.message}`);
  }
}

// -----------------------------------------------------------------------------
// 5. PASE 1 — asegurar que cada tabla (entidad) exista, con su columna primaria
// -----------------------------------------------------------------------------
async function ensureEntity(table) {
  const logicalName = logicalOf(table.schemaName);
  const existing = await entityExists(logicalName);
  if (existing) {
    console.log(`[table] ${table.displayName} (${logicalName}) ya existe.`);
    return existing.MetadataId;
  }
  console.log(`[table] ${table.displayName} (${logicalName}) NO existe -> ${DRY_RUN ? 'se crearia' : 'creando...'}`);
  if (DRY_RUN) return null;

  const body = {
    '@odata.type': 'Microsoft.Dynamics.CRM.EntityMetadata',
    SchemaName: table.schemaName,
    DisplayName: label(table.displayName),
    DisplayCollectionName: label(table.displayCollectionName),
    Description: label(table.description || table.displayName),
    OwnershipType: OWNERSHIP_MAP[table.ownershipType] || table.ownershipType,
    HasActivities: false,
    HasNotes: false,
    IsActivity: false,
    Attributes: [buildPrimaryAttribute(table.primaryColumn)],
  };
  const created = await post('EntityDefinitions', body);
  const info = await entityExists(logicalName);
  await addToSolution(info?.MetadataId, 1);
  return info?.MetadataId;
}

// -----------------------------------------------------------------------------
// 6. PASE 2 — asegurar columnas NO-lookup de cada tabla
// -----------------------------------------------------------------------------
async function ensurePlainColumns(table) {
  const logicalName = logicalOf(table.schemaName);
  const existing = await entityExists(logicalName);
  if (!existing && !DRY_RUN) { console.log(`   (se omite ${table.schemaName}: la tabla aun no existe)`); return; }
  const currentAttrs = existing ? await listAttributes(logicalName) : new Set();

  for (const col of table.columns.filter((c) => c.type !== 'Lookup')) {
    const colLogical = logicalOf(col.schemaName);
    if (currentAttrs.has(colLogical)) {
      console.log(`   [col] ${table.schemaName}.${col.schemaName} ya existe.`);
      continue;
    }
    console.log(`   [col] ${table.schemaName}.${col.schemaName} (${col.type}) NO existe -> ${DRY_RUN ? 'se crearia' : 'creando...'}`);
    if (DRY_RUN) continue;
    await post(`EntityDefinitions(LogicalName='${logicalName}')/Attributes`, buildAttribute(col));
  }
}

// -----------------------------------------------------------------------------
// 7. PASE 3 — asegurar columnas Lookup (= relaciones 1:N)
// -----------------------------------------------------------------------------
async function ensureLookupColumns(table) {
  const logicalName = logicalOf(table.schemaName);
  for (const col of table.columns.filter((c) => c.type === 'Lookup')) {
    const exists = await relationshipExists(col.relationshipSchemaName);
    if (exists) {
      console.log(`   [lookup] ${table.schemaName}.${col.schemaName} -> ${col.target} ya existe.`);
      continue;
    }
    console.log(`   [lookup] ${table.schemaName}.${col.schemaName} -> ${col.target} NO existe -> ${DRY_RUN ? 'se crearia' : 'creando...'}`);
    if (DRY_RUN) continue;

    const body = {
      '@odata.type': 'Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata',
      SchemaName: col.relationshipSchemaName,
      ReferencedEntity: logicalOf(col.target),
      ReferencedAttribute: `${logicalOf(col.target)}id`,
      CascadeConfiguration: { Assign: 'NoCascade', Delete: 'Restrict', Merge: 'NoCascade', Reparent: 'NoCascade', Share: 'NoCascade', Unshare: 'NoCascade' },
      ReferencingEntity: logicalName,
      Lookup: {
        '@odata.type': 'Microsoft.Dynamics.CRM.LookupAttributeMetadata',
        SchemaName: col.schemaName,
        DisplayName: label(col.displayName),
        RequiredLevel: requiredLevel(col.requiredLevel || 'None'),
      },
    };
    await post('RelationshipDefinitions', body);
    const rel = (await get(`RelationshipDefinitions?$select=MetadataId&$filter=SchemaName eq '${col.relationshipSchemaName}'`)).value[0];
    await addToSolution(rel?.MetadataId, 10);
  }
}

// -----------------------------------------------------------------------------
// 8. Publicar cambios (necesario para que se vean en la interfaz / Code Apps)
// -----------------------------------------------------------------------------
async function publishAll() {
  if (DRY_RUN) { console.log('\n[publish] (dry-run) se ejecutaria PublishAllXml al final.'); return; }
  console.log('\n[publish] Publicando todas las personalizaciones...');
  await post('PublishAllXml', {});
  console.log('[publish] Listo.');
}

// -----------------------------------------------------------------------------
// MAIN
// -----------------------------------------------------------------------------
async function main() {
  TOKEN = await getAccessToken();

  // Prueba de conexion: confirma que el token funciona en tu entorno antes de tocar nada.
  const who = await get('WhoAmI');
  console.log(`Conexion OK con Dataverse (UserId: ${who.UserId}).\n`);

  await ensurePublisherAndSolution();

  const allTargets = [
    ...TABLES,
    ...TABLE_EXTENSIONS.map((ext) => ({ schemaName: ext.targetTable, columns: ext.columns, isExtension: true })),
  ];

  console.log('--- PASE 1: tablas -----------------------------------------------');
  for (const t of TABLES) await ensureEntity(t); // las extensiones (contact) ya existen, no se crean

  console.log('\n--- PASE 2: columnas (sin lookups) --------------------------------');
  for (const t of allTargets) await ensurePlainColumns(t);

  console.log('\n--- PASE 3: columnas lookup / relaciones ---------------------------');
  for (const t of allTargets) await ensureLookupColumns(t);

  await publishAll();

  console.log('\n==================================================================');
  console.log(DRY_RUN
    ? ' DRY-RUN finalizado. No se modifico Dataverse. Revisa el detalle arriba.'
    : ' Proceso finalizado. Verifica las tablas en make.powerapps.com antes de usarlas.');
  console.log('==================================================================\n');
}

main().catch((err) => {
  console.error('\n[ERROR FATAL]', err.message);
  if (err.body) console.error(JSON.stringify(err.body, null, 2));
  process.exit(1);
});
