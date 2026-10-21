// Genera docs/modelo-er-grafico.html (diagrama ER interactivo) a partir de
// dataverse-schema-tool/schema.mjs, para que el diagrama nunca quede desactualizado.
//
// Uso (desde la raíz del proyecto), cada vez que cambie schema.mjs:
//   node docs/scripts/build-er-diagram.mjs
//
// El dibujo (zoom, arrastrar, resaltar) está en er-diagram.template.html; este
// script solo reemplaza /*__TABLES__*/ por los datos de las tablas.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const { TABLES, TABLE_EXTENSIONS } = await import(pathToFileURL(path.join(root, 'dataverse-schema-tool/schema.mjs')).href);

const TYPE_LABEL = {
  String: 'texto',
  Memo: 'texto largo',
  Integer: 'entero',
  Decimal: 'decimal',
  Boolean: 'sí/no',
  DateOnly: 'fecha',
  DateTime: 'fecha/hora',
  Picklist: 'choice',
  File: 'archivo',
};

/** Tablas estándar de Dataverse a las que apunta algún lookup (se dibujan en violeta). */
const STANDARD_TABLES = {
  systemuser: { title: 'User (estándar)', main: 'fullname' },
  contact: { title: 'Contact (estándar)', main: 'fullname' },
};

const logical = (schemaName) => schemaName.toLowerCase();

function columnRow(column) {
  if (column.type === 'Lookup') {
    const target = logical(column.target);
    return {
      n: logical(column.schemaName),
      t: `FK → ${target}`,
      k: 'fk',
      target,
      rel: column.relationshipSchemaName,
      req: column.requiredLevel === 'ApplicationRequired',
    };
  }
  return { n: logical(column.schemaName), t: TYPE_LABEL[column.type] ?? column.type, k: 'col' };
}

const tables = TABLES.map((table) => {
  const name = logical(table.schemaName);
  return {
    name,
    title: table.displayName,
    rows: [
      { n: `${name}id`, t: 'PK', k: 'pk' },
      { n: logical(table.primaryColumn.schemaName), t: 'columna principal', k: 'main' },
      ...table.columns.map(columnRow),
    ],
  };
});

// Tablas estándar: las extendidas (con sus columnas jsi_) y las que solo son destino de un lookup.
const names = new Set(tables.map((t) => t.name));
const standardNames = new Set([
  ...TABLE_EXTENSIONS.map((ext) => ext.targetTable),
  ...tables.flatMap((t) => t.rows.filter((r) => r.k === 'fk' && !names.has(r.target)).map((r) => r.target)),
]);
for (const name of standardNames) {
  const info = STANDARD_TABLES[name] ?? { title: `${name} (estándar)`, main: 'name' };
  const extension = TABLE_EXTENSIONS.find((ext) => ext.targetTable === name);
  tables.push({
    name,
    title: info.title,
    std: true,
    rows: [
      { n: `${name}id`, t: 'PK', k: 'pk' },
      { n: info.main, t: 'columna principal', k: 'main' },
      ...(extension?.columns.map(columnRow) ?? []),
    ],
  });
}

const template = fs.readFileSync(path.join(here, 'er-diagram.template.html'), 'utf8');
if (!template.includes('/*__TABLES__*/')) throw new Error('La plantilla no tiene el marcador /*__TABLES__*/');
const out = path.join(root, 'docs/modelo-er-grafico.html');
fs.writeFileSync(out, template.replace('/*__TABLES__*/', JSON.stringify(tables)));

const relationships = tables.reduce((sum, t) => sum + t.rows.filter((r) => r.k === 'fk').length, 0);
console.log(`Diagrama generado: ${path.relative(root, out)} · ${tables.length} tablas · ${relationships} relaciones`);
