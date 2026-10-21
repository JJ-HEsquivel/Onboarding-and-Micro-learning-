// Genera el tutorial interactivo "Parte 1 · De cero a la pantalla de inicio".
// El código de cada paso se lee de docs/tutorial/parte-1/solucion (código verificado: compila).
// Uso (desde la raíz del proyecto):
//   node docs/scripts/build-tutorial-part1.mjs
// Resultado: docs/tutorial/parte-1/tutorial-parte-1.html (se abre con doble clic en el navegador).
import fs from 'node:fs';
import path from 'node:path';
import { esc, highlightLine } from './doc-kit.mjs';

const ROOT = process.cwd();
const BASE = path.join(ROOT, 'docs/tutorial/parte-1');
const SOL = path.join(BASE, 'solucion');
const OUT = path.join(BASE, 'tutorial-parte-1.html');

const readSolution = (rel) => fs.readFileSync(path.join(SOL, rel), 'utf8').replace(/\r\n/g, '\n').replace(/\n$/, '');

/** Pinta un código y calcula el número de línea de cada explicación (busca el texto `m` en orden). */
function renderCode(source, notes = []) {
  const lines = source.split('\n');
  const state = { inComment: false };
  const html = lines.map((l) => highlightLine(l, state) || ' ');
  let from = 0;
  const explained = notes.map((note) => {
    const idx = lines.findIndex((l, i) => i >= from && l.includes(note.m));
    if (idx < 0) throw new Error(`No se encontró «${note.m}» en el código`);
    from = idx;
    const to = note.to ? lines.findIndex((l, i) => i > idx && l.includes(note.to)) : idx;
    if (to < 0) throw new Error(`No se encontró el fin «${note.to}»`);
    return { from: idx + 1, to: to + 1, text: note.t };
  });
  return { lines: html, notes: explained };
}

const fileBlock = (rel, notes, extra = {}) => ({ path: rel, ...renderCode(readSolution(rel), notes), ...extra });
const inlineBlock = (label, source, notes = [], extra = {}) => ({ path: label, ...renderCode(source, notes), ...extra });

// Archivos que existirán al final (para el árbol de carpetas que se va llenando).
const TREE = [
  'index.html',
  'vite.config.ts',
  'tsconfig.app.json',
  'src/main.tsx',
  'src/app/App.tsx',
  'src/app/router.tsx',
  'src/app/session/SessionContext.ts',
  'src/app/session/SessionProvider.tsx',
  'src/app/session/useSession.ts',
  'src/modules/index.ts',
  'src/modules/admin/admin.module.ts',
  'src/modules/manager/manager.module.ts',
  'src/modules/collaborator/collaborator.module.ts',
  'src/modules/auth/components/RolePeopleList.tsx',
  'src/modules/auth/pages/RoleSelectPage.tsx',
  'src/modules/auth/pages/RoleSelectPage.css',
  'src/services/dataverse.ts',
  'src/services/people.service.ts',
  'src/shared/components/Avatar.tsx',
  'src/shared/constants/choices.ts',
  'src/shared/hooks/useAsync.ts',
  'src/shared/lib/format.ts',
  'src/shared/styles/global.css',
  'src/shared/styles/components.css',
  'src/shared/types/navigation.ts',
  'src/generated/  (lo crea PAC, no se toca)',
];

// =============================================================================
// PASOS
// =============================================================================
const steps = [];
const add = (step) => steps.push(step);

// ---------- Introducción ----------
add({
  section: 'Antes de empezar',
  title: 'Bienvenido: qué vamos a construir',
  kind: 'intro',
  body: `
<p>En esta parte vas a escribir, <strong>desde cero</strong>, todo el código necesario para que tu Code App muestre la pantalla de inicio:</p>
<figure class="shot"><img src="__SCREENSHOT__" alt="Pantalla de inicio con el perfil Administración desplegado"/><figcaption>La meta: la tarjeta con los tres perfiles. Al abrir uno, la app consulta Dataverse y muestra las personas que tienen ese rol.</figcaption></figure>
<h3>Cómo usar este tutorial</h3>
<ul>
  <li>Avanza con <kbd>→</kbd> o el botón <strong>Siguiente</strong>, y retrocede con <kbd>←</kbd>. El tutorial recuerda en qué paso quedaste.</li>
  <li>Cada paso de código te dice <strong>qué archivo crear</strong>, te da el código completo con el botón <strong>Copiar</strong> y lo explica <strong>línea por línea</strong>. Pasa el mouse sobre una explicación y se resalta su línea.</li>
  <li>El árbol de la izquierda (abajo) muestra los archivos que ya creaste.</li>
  <li><strong>Escribe el código tú mismo</strong> en vez de copiarlo cuando puedas: así se aprende de verdad. El botón Copiar está para cuando te trabes.</li>
  <li>Si algo falla, compara con la carpeta <code>docs/tutorial/parte-1/solucion</code>: tiene cada archivo tal como debe quedar (y está verificado: compila sin errores).</li>
</ul>
<div class="note">Lo que ya sabes de bases de datos te va a servir mucho: en cada paso verás un recuadro <strong>🗄️ Con bases de datos…</strong> que compara lo nuevo con tablas, filas y consultas.</div>`,
});

add({
  section: 'Antes de empezar',
  title: 'Tu punto de partida',
  kind: 'intro',
  body: `
<p>Partimos de lo que ya hiciste con tus comandos:</p>
<ol>
  <li><code>npx degit github:microsoft/PowerAppsCodeApps/templates/vite .</code> → descargó la <strong>plantilla</strong>.</li>
  <li><code>npm install</code> → descargó las librerías en <code>node_modules</code>.</li>
  <li><code>pac auth create</code> y <code>pac code init</code> → conectaron el proyecto con tu entorno y crearon <code>power.config.json</code>.</li>
  <li>El script <code>dataverse-schema-tool</code> creó las tablas en Dataverse, y <code>npm run seed</code> cargó las personas base.</li>
</ol>
<p>La plantilla trae estos archivos (los que importan para nosotros):</p>
<pre class="tree">Onboarding-and-Micro-learning/
├── index.html          ← la única página HTML
├── package.json        ← comandos (npm run dev) y librerías
├── vite.config.ts      ← configuración del servidor de desarrollo
├── tsconfig.app.json   ← configuración de TypeScript
├── power.config.json   ← lo creó pac code init (tu entorno y tus tablas)
├── public/vite.svg
└── src/
    ├── main.tsx        ← el primer archivo de código que se ejecuta
    ├── App.tsx         ← un ejemplo con un contador
    ├── App.css, index.css
    └── assets/react.svg</pre>
<div class="concept"><div class="concept__title">💡 ¿Qué es cada cosa?</div>
<ul>
  <li><strong>HTML</strong>: la estructura de una página. <strong>CSS</strong>: su apariencia. <strong>JavaScript</strong>: su comportamiento.</li>
  <li><strong>TypeScript</strong> (<code>.ts</code>, <code>.tsx</code>): JavaScript con <em>tipos</em>; el editor te avisa en rojo si te equivocas.</li>
  <li><strong>React</strong>: arma la pantalla con <em>componentes</em> (funciones que devuelven lo que se dibuja).</li>
  <li><strong>Vite</strong>: el servidor que muestra la app mientras programas y la recarga al guardar.</li>
</ul></div>`,
});

add({
  section: 'Preparar el proyecto',
  title: 'Conectar las tablas que usa esta pantalla',
  kind: 'command',
  body: `
<p>La pantalla de inicio lee dos tablas: <code>contact</code> (las personas) y <code>jsi_roleassignment</code> (sus roles). En tu lista de comandos falta la segunda: agrégala. Ejecuta en la terminal, en la raíz del proyecto (donde está <code>power.config.json</code>):</p>
<pre class="term">pac code add-data-source -a dataverse -t contact
pac code add-data-source -a dataverse -t jsi_roleassignment</pre>
<p>Cada comando genera dos archivos dentro de <code>src/generated</code>:</p>
<ul>
  <li><code>models/ContactsModel.ts</code>: los <strong>tipos</strong> de las columnas de la tabla.</li>
  <li><code>services/ContactsService.ts</code>: las funciones <code>getAll</code>, <code>get</code>, <code>create</code>, <code>update</code> y <code>delete</code>.</li>
</ul>
<div class="db"><div class="db__title">🗄️ Con bases de datos…</div><code>getAll()</code> ≈ <code>SELECT</code> · <code>create()</code> ≈ <code>INSERT</code> · <code>update()</code> ≈ <code>UPDATE</code> · <code>delete()</code> ≈ <code>DELETE</code>. Los filtros se escriben en <strong>OData</strong>: <code>jsi_role eq 100000001</code> es como <code>WHERE jsi_role = 100000001</code>.</div>
<div class="note warn"><strong>Nunca edites</strong> lo que hay en <code>src/generated</code>: si cambias una columna en Dataverse, vuelves a ejecutar el comando y PAC lo regenera.</div>`,
  check: ['Existe src/generated/services/ContactsService.ts.', 'Existe src/generated/services/Jsi_roleassignmentsService.ts.'],
});

add({
  section: 'Preparar el proyecto',
  title: 'Instalar dos librerías',
  kind: 'command',
  body: `
<pre class="term">npm install react-router lucide-react</pre>
<ul>
  <li><strong>react-router</strong>: decide qué pantalla mostrar según la dirección (URL). Lo usaremos para que <code>#/</code> muestre la pantalla de inicio.</li>
  <li><strong>lucide-react</strong>: los íconos (el libro azul y la flechita de cada perfil).</li>
</ul>
<p>npm las descarga en <code>node_modules</code> y las anota en <code>package.json</code>, en <code>"dependencies"</code>.</p>`,
  check: ['En package.json aparecen "react-router" y "lucide-react".'],
});

add({
  section: 'Preparar el proyecto',
  title: 'Limpiar la plantilla',
  kind: 'command',
  body: `
<p>La plantilla trae un ejemplo (un contador con logos) que no vamos a usar. Bórralo:</p>
<pre class="term">Remove-Item src/App.css, src/index.css, public/vite.svg
Remove-Item -Recurse src/assets</pre>
<p>Ahora deja <code>src/App.tsx</code> y <code>src/main.tsx</code> mínimos, para que la app siga funcionando mientras construimos. Son <strong>temporales</strong>: al final los reemplazamos.</p>`,
  files: [
    inlineBlock('src/App.tsx  (temporal)', `export default function App() {
  return <h1>Hola, empezamos</h1>;
}`, [
      { m: 'export default function App', t: 'Un <strong>componente</strong> de React es una función. <code>export default</code> permite que otro archivo la importe.' },
      { m: 'return <h1>', t: 'Devuelve <strong>JSX</strong>: algo que parece HTML pero está dentro de JavaScript. Es lo que se dibuja.' },
    ]),
    inlineBlock('src/main.tsx  (temporal)', `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);`, [
      { m: "import { createRoot }", t: '<code>import</code> trae código de otro archivo o librería. Aquí traemos la función que conecta React con la página.' },
      { m: 'import App', t: 'Trae nuestro componente App (borramos la línea que importaba <code>index.css</code>, porque ya no existe).' },
      { m: 'createRoot(', t: 'Busca en <code>index.html</code> el <code>&lt;div id="root"&gt;</code> y le dice a React: «dibuja aquí».' },
      { m: '<App />', t: 'Usa el componente como una etiqueta. <code>StrictMode</code> solo agrega avisos en desarrollo.' },
    ]),
  ],
  check: ['Ejecutas <code>npm run dev</code>, abres el enlace «Local Play» y ves «Hola, empezamos».', 'Si cambias el texto y guardas, la página se actualiza sola.'],
});

add({
  section: 'Preparar el proyecto',
  title: 'Un atajo para las rutas: «@» = src',
  kind: 'file',
  intro: '<p>Sin un atajo, para importar un archivo lejano escribirías <code>../../../shared/…</code>. Con el alias <code>@</code> escribirás siempre <code>@/shared/…</code>. Hay que avisarle a <strong>Vite</strong> (que ejecuta la app) y a <strong>TypeScript</strong> (que revisa el código). Reemplaza el contenido de <code>vite.config.ts</code>:</p>',
  files: [
    fileBlock('vite.config.ts', [
      { m: "import { fileURLToPath", t: 'Herramientas de Node para convertir una dirección de archivo en una ruta de Windows.' },
      { m: 'plugins: [react(), powerApps()]', t: 'Los <strong>plugins</strong> de la plantilla: uno entiende React y el otro conecta el servidor con Power Apps (por eso aparece el enlace «Local Play»). No los quites.' },
      { m: 'alias: {', to: "'@':", t: 'El alias: cuando escribas <code>@/algo</code>, Vite lo busca en <code>./src/algo</code>.' },
    ]),
  ],
});

add({
  section: 'Preparar el proyecto',
  title: 'El mismo atajo para TypeScript',
  kind: 'file',
  intro: '<p>En <code>tsconfig.app.json</code> agrega <code>"paths"</code> al final de <code>compilerOptions</code> (fíjate en la coma de la línea anterior). El resto ya venía en la plantilla:</p>',
  files: [
    fileBlock('tsconfig.app.json', [
      { m: '"strict": true', t: 'Modo estricto: TypeScript revisa todo con cuidado. Mejor un aviso en rojo ahora que un error en producción.' },
      { m: '"noUncheckedSideEffectImports": true,', t: 'Esta línea ya existía: solo le agregamos la <strong>coma</strong> al final.' },
      { m: '"paths": {', to: '"@/*"', t: 'Lo nuevo: <code>@/*</code> apunta a <code>./src/*</code>. Ahora VSCode entiende el atajo y no lo marca en rojo.' },
    ]),
  ],
  check: ['Guardaste los dos archivos.', 'Si VSCode marca algo en rojo en tsconfig.app.json, revisa las comas.'],
});

add({
  section: 'Preparar el proyecto',
  title: 'Crear las carpetas',
  kind: 'command',
  body: `
<p>Cada carpeta tiene una responsabilidad. Créalas todas de una vez:</p>
<pre class="term">New-Item -ItemType Directory -Force src/app/session, src/modules/admin, src/modules/manager, src/modules/collaborator, src/modules/auth/pages, src/modules/auth/components, src/services, src/shared/components, src/shared/constants, src/shared/hooks, src/shared/lib, src/shared/styles, src/shared/types</pre>
<table class="grid">
  <tr><th>Carpeta</th><th>Qué va ahí</th></tr>
  <tr><td><code>src/app</code></td><td>El arranque: App, las rutas y la sesión.</td></tr>
  <tr><td><code>src/modules</code></td><td>Un módulo por rol (admin, manager, collaborator) y <code>auth</code> (la pantalla de inicio).</td></tr>
  <tr><td><code>src/services</code></td><td>El código que lee y escribe en Dataverse. Las pantallas nunca hablan directo con Dataverse.</td></tr>
  <tr><td><code>src/shared</code></td><td>Lo que comparten todos: componentes, tipos, estilos, utilidades.</td></tr>
  <tr><td><code>src/generated</code></td><td>Lo generado por PAC (ya existe).</td></tr>
</table>
<div class="db"><div class="db__title">🗄️ Con bases de datos…</div>Igual que separas tablas por tema, el código se separa por responsabilidad. Si mañana cambia cómo se lee Dataverse, solo tocas <code>services</code>.</div>`,
});

// ---------- Estilos ----------
add({
  section: 'Estilos',
  title: 'Los colores de toda la app',
  kind: 'file',
  intro: '<p>Crea <code>src/shared/styles/global.css</code>. Aquí se definen los colores <strong>una sola vez</strong> y unas reglas base para toda la página:</p>',
  files: [
    fileBlock('src/shared/styles/global.css', [
      { m: ':root {', t: '<code>:root</code> es la raíz de la página: lo que definas aquí lo ve todo el documento.' },
      { m: '--color-primary', t: 'Una <strong>variable CSS</strong> («token»). Se usa así: <code>color: var(--color-primary)</code>. Si mañana cambia el azul de la marca, cambias solo esta línea.' },
      { m: '--color-bg', to: '--color-text-muted', t: 'Fondo de la página, superficie de las tarjetas, bordes y colores de texto.' },
      { m: '--radius-card', t: 'También se guardan medidas: el redondeo de las esquinas de las tarjetas.' },
      { m: 'font-family', t: 'La letra de toda la app: Segoe UI (la de Windows).' },
      { m: 'box-sizing: border-box', t: 'Hace que el ancho de una caja incluya su borde y su relleno. Evita sorpresas al medir.' },
      { m: 'body {', to: 'background: var(--color-bg)', t: 'Quita el margen que el navegador pone por defecto y pinta el fondo gris claro.' },
      { m: 'list-style: none', t: 'Las listas (<code>ul</code>) sin viñetas: las usamos para dibujar los perfiles.' },
    ]),
  ],
  db: 'Una variable CSS es como un valor de configuración guardado en una tabla de parámetros: se lee en muchos lugares y se cambia en uno.',
});

add({
  section: 'Estilos',
  title: 'El estilo del avatar',
  kind: 'file',
  intro: '<p>Crea <code>src/shared/styles/components.css</code> para los componentes compartidos. Por ahora solo el avatar (el círculo con iniciales):</p>',
  files: [
    fileBlock('src/shared/styles/components.css', [
      { m: '.avatar {', t: 'Una <strong>clase CSS</strong>: se aplica a cualquier elemento con <code>className="avatar"</code>.' },
      { m: 'place-items: center', t: 'Centra las iniciales dentro del círculo.' },
      { m: 'border-radius: 50%', t: 'Esquinas redondeadas al 50% = un círculo.' },
      { m: '.avatar--sm {', t: 'Una <strong>variante</strong> de tamaño. El nombre <code>bloque--variante</code> sigue la convención <strong>BEM</strong>, que evita que los estilos choquen.' },
    ]),
  ],
});

// ---------- Datos ----------
add({
  section: 'Datos',
  title: 'Los valores del rol (columna Choice)',
  kind: 'file',
  intro: '<p>En Dataverse, <code>jsi_roleassignment.jsi_role</code> es una columna <strong>Choice</strong>: guarda números. Para no escribir números sueltos por todo el código, les ponemos nombre. Crea <code>src/shared/constants/choices.ts</code>:</p>',
  files: [
    fileBlock('src/shared/constants/choices.ts', [
      { m: 'import type { Jsi_roleassignmentsjsi_role }', t: 'Trae el <strong>tipo</strong> que generó PAC con los valores válidos de la columna. <code>import type</code> = solo se importa la descripción, no código.' },
      { m: 'export const ROLE = {', t: 'Un <strong>objeto</strong>: pares nombre → valor. <code>export</code> permite usarlo desde otros archivos.' },
      { m: 'Administrator: 100000000', to: 'Collaborator: 100000002', t: 'Los mismos números que guarda Dataverse. En el código escribirás <code>ROLE.Manager</code> en vez de <code>100000001</code>.' },
      { m: '} as const satisfies', t: '<code>as const</code>: los valores no cambian. <code>satisfies</code>: TypeScript comprueba que cada número exista en la columna de Dataverse. Si alguien cambia la columna y regenera, aquí aparece un error en rojo.' },
      { m: 'export type RoleValue', t: 'Un tipo que significa «uno de esos tres números». Lo usarán otras funciones para aceptar solo roles válidos.' },
    ]),
  ],
  db: 'Es una tabla de catálogo: <code>100000000 = Administrator, 100000001 = Manager, 100000002 = Collaborator</code>. El código usa el nombre y Dataverse guarda el número.',
});

add({
  section: 'Datos',
  title: 'Describir los datos: los tipos',
  kind: 'file',
  intro: '<p>Crea <code>src/shared/types/navigation.ts</code>. Aquí describimos la <strong>forma</strong> de los datos que maneja la pantalla:</p>',
  files: [
    fileBlock('src/shared/types/navigation.ts', [
      { m: "export type UserRole", t: 'Un tipo que solo admite tres textos. El <code>|</code> significa «o». Si escribes <code>\'admn\'</code> por error, VSCode lo marca.' },
      { m: 'export interface SessionUser', to: 'jobTitle: string;', t: 'Una <strong>interface</strong> describe un objeto: la persona con la que se ingresa tiene <code>id</code>, <code>fullName</code> y <code>jobTitle</code>, los tres de tipo texto (<code>string</code>).' },
      { m: 'export interface RoleModule', t: 'La configuración de cada rol. En la parte 2 le agregaremos su menú lateral.' },
      { m: 'dataverseRole: RoleValue', t: 'Usa el tipo del paso anterior: solo acepta uno de los tres números de rol.' },
      { m: 'basePath: string', t: 'La dirección de sus pantallas, por ejemplo <code>/admin</code>.' },
    ]),
  ],
  db: 'Una <strong>interface</strong> es como la definición de una tabla (sus columnas y tipos) y un objeto es una fila: <code>{ id: \'8b…\', fullName: \'Iván Suárez\', jobTitle: \'Engineering Manager\' }</code>.',
});

add({
  section: 'Datos',
  title: 'Ayudantes para leer Dataverse',
  kind: 'file',
  intro: '<p>Crea <code>src/services/dataverse.ts</code>. Son tres herramientas que usarán todos los servicios:</p>',
  files: [
    fileBlock('src/services/dataverse.ts', [
      { m: "import type { IOperationResult }", t: '<code>IOperationResult</code> es lo que devuelven los servicios generados: <code>success</code> (si salió bien), <code>data</code> (los datos) y <code>error</code>.' },
      { m: "export const ACTIVE_RECORDS", t: 'Un filtro OData reutilizable: solo registros activos. En Dataverse, <code>statecode = 1</code> significa desactivado.' },
      { m: 'const MAX_PAGES', t: 'Un límite de seguridad para no quedar en un ciclo infinito si algo falla.' },
      { m: 'export function unwrap<T>', t: '<code>&lt;T&gt;</code> es un <strong>genérico</strong>: «funciona con cualquier tipo de dato». Así sirve para personas, roles o lo que sea.' },
      { m: 'if (!result.success)', to: 'throw new Error', t: 'Si la operación falló, <strong>lanza un error</strong> con un mensaje claro (ej. «Leer roles: …»). <code>throw</code> corta la ejecución.' },
      { m: 'return result.data;', t: 'Si salió bien, devuelve solo los datos.' },
      { m: 'export async function fetchAll<T>', t: '<code>async</code>: la función hace algo que tarda (consultar internet) y se puede <strong>esperar</strong> con <code>await</code>.' },
      { m: 'getAll: (options: IGetAllOptions)', t: 'Recibe <strong>una función como parámetro</strong>: el <code>getAll</code> de la tabla que se quiera leer.' },
      { m: 'do {', to: 'while (skipToken', t: 'Dataverse devuelve los resultados <strong>por páginas</strong>. Este ciclo pide una página, la agrega a <code>rows</code> y, si hay <code>skipToken</code> (la marca de «hay más»), pide la siguiente.' },
      { m: 'const result = await getAll', t: '<code>await</code>: espera la respuesta de Dataverse sin congelar la pantalla.' },
    ]),
  ],
  db: '<code>fetchAll</code> es como leer un resultado paginado hasta el final. <code>ACTIVE_RECORDS</code> es el <code>WHERE statecode = 0</code> que pondrías en casi todas tus consultas.',
});

add({
  section: 'Datos',
  title: 'El servicio de personas',
  kind: 'file',
  intro: '<p>Crea <code>src/services/people.service.ts</code>. Responde a la pregunta de la pantalla: <em>¿qué personas tienen el rol X?</em></p>',
  files: [
    fileBlock('src/services/people.service.ts', [
      { m: "import { ContactsService }", to: 'import type { Contacts }', t: 'Los servicios y el modelo que generó PAC para las tablas <code>contact</code> y <code>jsi_roleassignment</code>.' },
      { m: "import { ACTIVE_RECORDS, fetchAll } from './dataverse'", t: 'Nuestros ayudantes del paso anterior. <code>./</code> = la misma carpeta.' },
      { m: 'const PERSON_FIELDS', t: 'Las columnas que necesitamos: como el <code>SELECT contactid, fullname, jsi_jobtitle</code>. Pedir solo lo necesario hace la consulta más rápida.' },
      { m: 'async function getPeopleById()', t: 'Lee <strong>todas las personas activas</strong>. No tiene <code>export</code>: solo se usa dentro de este archivo.' },
      { m: '(o) => ContactsService.getAll(o)', t: 'Una <strong>función flecha</strong>: recibe las opciones <code>o</code> y llama al <code>getAll</code> generado. Se la pasamos a <code>fetchAll</code>.' },
      { m: 'return new Map(', t: 'Un <strong>Map</strong> es un diccionario: <code>contactid → persona</code>. Sirve para buscar una persona por id al instante.' },
      { m: 'async function getPersonIdsWithRole', t: 'Lee los <strong>ids</strong> de quienes tienen un rol.' },
      { m: "select: ['_jsi_person_value']", t: 'Las columnas lookup se leen como <code>_columna_value</code>: aquí está el <code>contactid</code> de la persona.' },
      { m: 'filter: `${ACTIVE_RECORDS}', t: 'El filtro OData: registro activo, rol activo y del rol pedido. <code>`…${…}…`</code> es un texto donde se insertan valores.' },
      { m: 'return new Set(', t: 'Un <strong>Set</strong> es una lista sin repetidos. <code>flatMap</code> descarta los que vienen vacíos.' },
      { m: 'export async function listPeopleWithRole', t: 'La única función <strong>exportada</strong>: la que usará la pantalla.' },
      { m: 'await Promise.all([', t: 'Hace las <strong>dos consultas a la vez</strong> y espera ambas: más rápido que una tras otra.' },
      { m: 'return [...ids]', to: 'return person ? [', t: 'Recorre los ids, busca cada persona en el Map y arma el objeto <code>SessionUser</code>. <code>?? \'\'</code> = «si viene vacío, usa texto vacío».' },
      { m: '.sort((a, b)', t: 'Ordena por nombre. <code>localeCompare</code> respeta tildes y la ñ.' },
    ]),
  ],
  db: `<code>listPeopleWithRole(ROLE.Manager)</code> equivale a:<br/><code>SELECT c.contactid, c.fullname, c.jsi_jobtitle FROM contact c JOIN jsi_roleassignment r ON r.jsi_person = c.contactid WHERE c.statecode = 0 AND r.statecode = 0 AND r.jsi_isactive = 1 AND r.jsi_role = 100000001 ORDER BY c.fullname</code><br/>La diferencia: el JOIN y el ORDER BY se hacen en el navegador.`,
});

add({
  section: 'Datos',
  title: 'useAsync: esperar datos sin congelar la pantalla',
  kind: 'file',
  intro: '<p>Una pantalla que lee Dataverse tiene tres estados: <em>cargando</em>, <em>error</em> o <em>datos listos</em>. Este <strong>hook</strong> lo resuelve una vez para todas las pantallas. Crea <code>src/shared/hooks/useAsync.ts</code>:</p>',
  files: [
    fileBlock('src/shared/hooks/useAsync.ts', [
      { m: "import { useCallback, useEffect, useState }", t: 'Tres <strong>hooks</strong> de React. Un hook es una función que empieza con <code>use</code> y le da memoria o comportamiento a un componente.' },
      { m: 'interface AsyncState<T>', t: 'La forma del estado: los datos, el error y si está cargando.' },
      { m: 'export function useAsync<T>(loader', t: 'Recibe <code>loader</code>: la función que trae los datos (por ejemplo, <code>listPeopleWithRole</code>).' },
      { m: 'const [state, setState] = useState', t: '<strong>useState</strong> guarda un valor que, al cambiar con <code>setState</code>, hace que React <strong>vuelva a dibujar</strong>. Empieza en «cargando».' },
      { m: 'useEffect(() => {', t: '<strong>useEffect</strong> ejecuta código <em>después</em> de dibujar: el momento justo para ir a buscar los datos.' },
      { m: 'loader().then(', to: 'loading: false,', t: 'Llama al loader. <code>.then(éxito, error)</code>: si llegan datos los guarda; si falla, guarda el error.' },
      { m: 'active = false;', t: 'Si la pantalla se cierra antes de que llegue la respuesta, se ignora (evita errores).' },
      { m: '}, [loader, version]);', t: 'Las <strong>dependencias</strong>: el efecto se repite solo si cambia el loader o si pedimos recargar.' },
      { m: 'const reload = useCallback', t: '<code>reload()</code> vuelve a cargar: cambia <code>version</code> y eso repite el efecto.' },
      { m: 'return { ...state, reload }', t: 'Devuelve <code>data</code>, <code>error</code>, <code>loading</code> y <code>reload</code>. Los <code>...</code> copian todas las propiedades de <code>state</code>.' },
    ]),
  ],
});

// ---------- Sesión ----------
add({
  section: 'Sesión',
  title: 'La sesión (1/3): qué guardamos',
  kind: 'file',
  intro: '<p>Cuando elijas a una persona, la app debe recordarla. Usamos un <strong>contexto</strong> de React: un dato que cualquier pantalla puede leer sin pasarlo de mano en mano. Crea <code>src/app/session/SessionContext.ts</code>:</p>',
  files: [
    fileBlock('src/app/session/SessionContext.ts', [
      { m: 'export interface Session', to: 'user: SessionUser;', t: 'La sesión: con qué <strong>rol</strong> y con qué <strong>persona</strong> se ingresó.' },
      { m: 'export interface SessionContextValue', t: 'Lo que ofrecerá el contexto a las pantallas:' },
      { m: 'session: Session | null', t: 'La sesión actual, o <code>null</code> si nadie ingresó.' },
      { m: 'signIn: (session: Session) => void', t: '<strong>signIn</strong>: una función para entrar. <code>=&gt; void</code> significa que no devuelve nada.' },
      { m: 'signOut: () => void', t: '<strong>signOut</strong>: una función para salir.' },
      { m: 'export const SessionContext = createContext', t: 'Crea el contexto. Empieza en <code>null</code> hasta que lo «llene» el Provider del siguiente paso.' },
    ]),
  ],
});

add({
  section: 'Sesión',
  title: 'La sesión (2/3): el Provider',
  kind: 'file',
  intro: '<p>El <strong>Provider</strong> es el componente que guarda la sesión y la ofrece a todo lo que esté dentro de él. Crea <code>src/app/session/SessionProvider.tsx</code> (extensión <code>.tsx</code> porque devuelve JSX):</p>',
  files: [
    fileBlock('src/app/session/SessionProvider.tsx', [
      { m: "const STORAGE_KEY", t: 'El nombre con el que se guarda en el navegador.' },
      { m: 'function readStoredSession()', to: 'return null;', t: 'Lee la sesión guardada en <strong>sessionStorage</strong> (una memoria del navegador que dura mientras la pestaña esté abierta). <code>JSON.parse</code> convierte el texto guardado en un objeto. <code>try/catch</code> evita que la app se rompa si el navegador no permite guardar.' },
      { m: 'function storeSession(', t: 'Guarda la sesión como texto (<code>JSON.stringify</code>) o la borra si es <code>null</code>.' },
      { m: 'export function SessionProvider({ children }', t: '<code>children</code> es lo que va <em>dentro</em> del Provider (toda la app). <code>ReactNode</code> = «cualquier cosa que React pueda dibujar».' },
      { m: 'useState<Session | null>(readStoredSession)', t: 'El estado empieza con lo que haya guardado: si recargas la página, sigues con la misma persona.' },
      { m: 'const signIn = useCallback', t: 'Entrar: guarda la sesión y actualiza el estado (React redibuja). <code>useCallback</code> crea la función una sola vez.' },
      { m: 'const signOut = useCallback', t: 'Salir: borra la sesión.' },
      { m: 'const value = useMemo', t: '<code>useMemo</code> evita crear un objeto nuevo en cada dibujo si nada cambió.' },
      { m: 'return <SessionContext.Provider', t: 'Ofrece <code>value</code> a todos los componentes que estén dentro (<code>children</code>).' },
    ]),
  ],
  db: 'sessionStorage es como una pequeña tabla clave-valor que vive en el navegador: <code>onboarding.session → {"role":"manager","user":{…}}</code>.',
});

add({
  section: 'Sesión',
  title: 'La sesión (3/3): leerla desde cualquier pantalla',
  kind: 'file',
  intro: '<p>Un hook propio para leer la sesión fácilmente. Crea <code>src/app/session/useSession.ts</code>:</p>',
  files: [
    fileBlock('src/app/session/useSession.ts', [
      { m: 'export function useSession()', t: 'Cualquier componente escribirá <code>const { session, signIn } = useSession();</code>.' },
      { m: 'const context = useContext(SessionContext)', t: '<code>useContext</code> lee el valor que ofrece el Provider más cercano.' },
      { m: "if (!context) throw new Error", t: 'Si alguien usa el hook fuera del Provider, avisa con un error claro en vez de fallar en silencio.' },
    ]),
  ],
  check: ['Tienes los tres archivos en src/app/session.', 'Sabes que signIn guarda la sesión y que sobrevive a recargar la página.'],
});

// ---------- Roles ----------
add({
  section: 'Roles',
  title: 'Configurar los roles (1/2)',
  kind: 'file',
  intro: '<p>Cada rol se describe una sola vez en su propio archivo. Crea los tres módulos:</p>',
  files: [
    fileBlock('src/modules/admin/admin.module.ts', [
      { m: "import { ROLE }", t: 'Los valores del rol del paso «Choice».' },
      { m: 'export const adminModule: RoleModule = {', t: 'Una constante con el tipo <code>RoleModule</code>: TypeScript exige que tenga todos sus campos.' },
      { m: "role: 'admin'", to: "basePath: '/admin'", t: 'Su rol, el número en Dataverse, el nombre que se muestra y la dirección de sus pantallas.' },
    ]),
    fileBlock('src/modules/manager/manager.module.ts', [{ m: 'dataverseRole: ROLE.Manager', t: 'Igual que el anterior, con el rol Manager.' }]),
    fileBlock('src/modules/collaborator/collaborator.module.ts', [{ m: "basePath: '/colaborador'", t: 'Igual, con el rol Colaborador. La dirección está en español porque la ve el usuario.' }]),
  ],
});

add({
  section: 'Roles',
  title: 'Configurar los roles (2/2): la lista',
  kind: 'file',
  intro: '<p>Crea <code>src/modules/index.ts</code>: junta los tres roles en una lista. La pantalla de inicio la recorrerá para dibujar los tres perfiles.</p>',
  files: [
    fileBlock('src/modules/index.ts', [
      { m: "import { adminModule }", to: 'import { collaboratorModule }', t: 'Trae los tres módulos.' },
      { m: 'export const roleModules: RoleModule[]', t: '<code>RoleModule[]</code> = una lista de RoleModule. El orden de la lista es el orden en pantalla.' },
    ]),
  ],
  db: 'Es como una tabla «perfiles» con tres filas. Para agregar un rol nuevo agregarías una fila: aquí, un módulo nuevo en esta lista.',
});

// ---------- Componentes ----------
add({
  section: 'Componentes',
  title: 'Las iniciales',
  kind: 'file',
  intro: '<p>Una función de utilidad, sin pantalla. Crea <code>src/shared/lib/format.ts</code>:</p>',
  files: [
    fileBlock('src/shared/lib/format.ts', [
      { m: 'const words = fullName.trim()', t: '<code>trim()</code> quita espacios de los extremos; <code>split(/\\s+/)</code> separa por espacios; <code>filter(Boolean)</code> quita vacíos. «Juan Jose Ezequiel» → <code>[\'Juan\', \'Jose\', \'Ezequiel\']</code>.' },
      { m: "if (words.length === 0) return '?'", t: 'Si no hay nombre, muestra «?».' },
      { m: 'const first = words[0][0]', t: 'La primera letra de la primera palabra. Las listas empiezan en la posición 0.' },
      { m: 'const last = words.length > 1', t: 'Si hay más de una palabra, la primera letra de la última. <code>condición ? a : b</code> es un «si/si no» corto.' },
      { m: 'return (first + last).toUpperCase()', t: 'Las une y las pasa a mayúsculas: «JE».' },
    ]),
  ],
});

add({
  section: 'Componentes',
  title: 'Tu primer componente: Avatar',
  kind: 'file',
  intro: '<p>Crea <code>src/shared/components/Avatar.tsx</code>. Es el componente más simple de la app:</p>',
  files: [
    fileBlock('src/shared/components/Avatar.tsx', [
      { m: 'interface AvatarProps', t: 'Las <strong>props</strong> del componente: los datos que recibe, como los parámetros de una función.' },
      { m: "size?: 'sm' | 'md'", t: 'El <code>?</code> significa «opcional»: puedes no pasarlo.' },
      { m: "export function Avatar({ initials, size = 'md' }", t: 'Recibe las props. <code>size = \'md\'</code>: si no se indica tamaño, usa el mediano.' },
      { m: 'return <span className=', t: 'En JSX se escribe <code>className</code> (no <code>class</code>). <code>avatar avatar--sm</code> aplica las dos clases CSS del paso de estilos. <code>{initials}</code> inserta el valor.' },
    ]),
  ],
  db: 'Un componente con props es como una vista parametrizada: le das parámetros y siempre devuelve el mismo formato.',
});

add({
  section: 'Componentes',
  title: 'La lista de personas de un rol',
  kind: 'file',
  intro: '<p>Este componente aparece debajo de un perfil cuando lo abres. Consulta Dataverse y muestra las personas. Crea <code>src/modules/auth/components/RolePeopleList.tsx</code>:</p>',
  files: [
    fileBlock('src/modules/auth/components/RolePeopleList.tsx', [
      { m: "import { listPeopleWithRole }", t: 'El servicio que escribimos: así la pantalla obtiene los datos sin saber nada de Dataverse.' },
      { m: 'interface RolePeopleListProps', to: 'onSelect: (user: SessionUser) => void;', t: 'Recibe el rol (<code>module</code>) y una función <code>onSelect</code> para avisar qué persona se eligió. Quien usa el componente decide qué hacer.' },
      { m: 'const loadPeople = useCallback', t: 'Crea la función de carga para este rol. <code>useCallback</code> la mantiene estable (useAsync lo necesita para no repetir la consulta sin fin).' },
      { m: 'const { data: people, error, loading } = useAsync', t: 'Usa nuestro hook. <code>data: people</code> renombra <code>data</code> a <code>people</code>.' },
      { m: 'if (loading) return', t: 'Mientras consulta Dataverse, muestra «Cargando personas…». <code>return</code> temprano: lo de abajo no se dibuja.' },
      { m: 'if (error) return', t: 'Si falló, muestra el mensaje en rojo.' },
      { m: 'if (!people || people.length === 0)', t: 'Si no hay nadie con ese rol, lo explica (y dice dónde asignarlo).' },
      { m: '{people.map((person) => (', t: '<code>map</code> recorre la lista y dibuja un elemento por persona.' },
      { m: '<li key={person.id}>', t: 'React necesita una <code>key</code> única en cada elemento de una lista, para saber cuál es cuál.' },
      { m: 'onClick={() => onSelect(person)}', t: 'Al hacer clic, avisa qué persona se eligió.' },
      { m: '<Avatar initials={getInitials(person.fullName)}', t: 'Usa los dos pasos anteriores: calcula las iniciales y dibuja el avatar pequeño.' },
      { m: '{person.jobTitle && <small>', t: '<code>condición &amp;&amp; &lt;…&gt;</code>: dibuja el cargo solo si existe.' },
    ]),
  ],
});

// ---------- Pantalla ----------
add({
  section: 'Pantalla de inicio',
  title: 'Los estilos de la pantalla de inicio',
  kind: 'file',
  intro: '<p>Crea <code>src/modules/auth/pages/RoleSelectPage.css</code>. Cada clase corresponde a una parte de la captura:</p>',
  files: [
    fileBlock('src/modules/auth/pages/RoleSelectPage.css', [
      { m: '.role-select {', to: 'min-height: 100vh', t: 'Ocupa toda la altura de la ventana (<code>100vh</code>) y centra la tarjeta.' },
      { m: '.role-select__card {', t: 'La tarjeta blanca: ancho máximo, relleno, borde y esquinas redondeadas (con los tokens de global.css).' },
      { m: '.role-select__logo {', t: 'El cuadrado azul con el ícono del libro.' },
      { m: '.role-select__item {', t: 'Cada perfil (Administración, Manager, Colaborador) con su borde.' },
      { m: '.role-select__item--open,', t: 'Cuando el perfil está abierto (o el mouse está encima), el borde se pone azul.' },
      { m: '.role-select__option {', t: 'El botón del perfil: nombre a la izquierda y flecha a la derecha (<code>justify-content: space-between</code>).' },
      { m: '.role-select__item--open .role-select__chevron', t: 'La flecha gira 180° cuando el perfil está abierto.' },
      { m: '.role-people {', t: 'El fondo gris claro de la lista de personas.' },
      { m: '.role-people__person:hover', t: 'Al pasar el mouse por una persona se pinta de celeste.' },
      { m: '.role-people__message--error', t: 'Los errores en rojo.' },
    ]),
  ],
});

add({
  section: 'Pantalla de inicio',
  title: 'La pantalla de inicio',
  kind: 'file',
  intro: '<p>Ahora sí, la pantalla. Crea <code>src/modules/auth/pages/RoleSelectPage.tsx</code>:</p>',
  files: [
    fileBlock('src/modules/auth/pages/RoleSelectPage.tsx', [
      { m: "import { useNavigate }", t: 'Para cambiar de pantalla por código.' },
      { m: "import { BookOpen, ChevronDown }", t: 'Dos íconos de lucide-react: el libro y la flecha.' },
      { m: "import './RoleSelectPage.css'", t: 'Carga los estilos del paso anterior.' },
      { m: 'export default function RoleSelectPage()', t: '<code>export default</code>: el archivo exporta un componente principal (lo importará el router).' },
      { m: 'const [openRole, setOpenRole] = useState', t: 'Estado: qué perfil está abierto. Empieza en <code>null</code> (ninguno). <code>RoleModule[\'role\']</code> = el tipo del campo <code>role</code>.' },
      { m: 'const { signIn } = useSession()', t: 'Trae la función para iniciar sesión.' },
      { m: 'const enter = (module: RoleModule, user: SessionUser)', to: 'navigate(module.basePath);', t: 'Al elegir una persona: guarda la sesión y navega a la dirección del rol (por ejemplo <code>/manager</code>).' },
      { m: '<div className="role-select">', to: 'Seleccione el perfil', t: 'La tarjeta: logo, título y subtítulo. <code>&amp;amp;</code> escribe el símbolo <code>&amp;</code>.' },
      { m: '{roleModules.map((module) => {', t: 'Recorre los tres roles: por eso aparecen tres perfiles.' },
      { m: 'const isOpen = openRole === module.role', t: '¿Es este el perfil abierto?' },
      { m: '<li key={module.role} className=', t: 'Si está abierto, agrega la clase <code>role-select__item--open</code> (borde azul). <code>`…${…}`</code> arma el texto de las clases.' },
      { m: 'aria-expanded={isOpen}', t: 'Accesibilidad: le dice a los lectores de pantalla si el perfil está abierto.' },
      { m: 'onClick={() => setOpenRole(isOpen ? null : module.role)}', t: 'Al hacer clic: si estaba abierto lo cierra; si no, lo abre. Cambiar el estado hace que React <strong>redibuje</strong>.' },
      { m: '{isOpen && <RolePeopleList', t: 'Solo si está abierto se dibuja la lista de personas (y solo entonces se consulta Dataverse). Al elegir una persona se llama a <code>enter</code>.' },
    ]),
  ],
});

// ---------- Arranque ----------
add({
  section: 'Arranque',
  title: 'Las rutas: qué pantalla va en cada dirección',
  kind: 'file',
  intro: '<p>Crea <code>src/app/router.tsx</code>. Por ahora hay una sola pantalla:</p>',
  files: [
    fileBlock('src/app/router.tsx', [
      { m: 'import { createHashRouter, Navigate }', t: '<code>createHashRouter</code> usa direcciones con <code>#</code> (ej. <code>…/#/manager</code>), que funcionan bien dentro de Power Apps.' },
      { m: "{ path: '/', element: <RoleSelectPage /> }", t: 'La dirección <code>/</code> (la de inicio) muestra nuestra pantalla.' },
      { m: "{ path: '*', element: <Navigate", t: 'Cualquier otra dirección vuelve al inicio. Por eso, al elegir una persona (que lleva a <code>/manager</code>, que aún no existe) volverás al inicio: en la parte 2 crearemos esas pantallas.' },
    ]),
  ],
  db: 'El router es como una tabla de dos columnas: <code>dirección → pantalla</code>.',
});

add({
  section: 'Arranque',
  title: 'App: juntar sesión y rutas',
  kind: 'file',
  intro: '<p>Crea <code>src/app/App.tsx</code> y <strong>borra el App.tsx temporal</strong> de <code>src</code>:</p><pre class="term">Remove-Item src/App.tsx</pre>',
  files: [
    fileBlock('src/app/App.tsx', [
      { m: 'export default function App()', t: 'El componente raíz de la app.' },
      { m: '<SessionProvider>', t: 'Envuelve todo con la sesión: cualquier pantalla de adentro puede usar <code>useSession()</code>.' },
      { m: '<RouterProvider router={router} />', t: 'Mira la dirección actual y dibuja la pantalla que corresponde según <code>router.tsx</code>.' },
    ]),
  ],
});

add({
  section: 'Arranque',
  title: 'main.tsx: el punto de entrada final',
  kind: 'file',
  intro: '<p>Reemplaza todo <code>src/main.tsx</code>:</p>',
  files: [
    fileBlock('src/main.tsx', [
      { m: "import './shared/styles/global.css'", to: "import './shared/styles/components.css'", t: 'Carga los estilos globales <strong>antes</strong> que la app, para que cada pantalla pueda ajustarlos después.' },
      { m: "import App from './app/App'", t: 'Ahora App está en la carpeta <code>app</code>.' },
      { m: "createRoot(document.getElementById('root')!)", t: 'El <code>!</code> le dice a TypeScript «confía, ese elemento existe» (está en index.html).' },
    ]),
  ],
});

add({
  section: 'Arranque',
  title: 'index.html: título e idioma',
  kind: 'file',
  intro: '<p>Último archivo. En <code>index.html</code> cambia el idioma, el título de la pestaña y quita el ícono de Vite (lo borramos al limpiar):</p>',
  files: [
    fileBlock('index.html', [
      { m: '<html lang="es">', t: 'El idioma de la página: español.' },
      { m: '<title>', t: 'El texto de la pestaña del navegador.' },
      { m: '<div id="root"></div>', t: 'La caja donde React dibuja todo (la que busca <code>main.tsx</code>).' },
      { m: '<script type="module" src="/src/main.tsx">', t: 'Carga <code>main.tsx</code>: así empieza todo.' },
    ]),
  ],
});

// ---------- Probar ----------
add({
  section: 'Probar',
  title: '¡Ejecutar y probar!',
  kind: 'intro',
  body: `
<pre class="term">npm run dev</pre>
<p>Abre el enlace <strong>«Local Play»</strong> con la cuenta de tu entorno (la universitaria). Deberías ver la pantalla de la captura. Prueba:</p>
<ol>
  <li>Haz clic en <strong>Administración</strong>: aparece «Cargando personas…» y luego Juan Jose y Marcelo.</li>
  <li>Haz clic de nuevo: se cierra. Abre <strong>Manager</strong>: aparecen Gabriela, Iván y Sofía.</li>
  <li>Elige a una persona: como su pantalla aún no existe, vuelves al inicio. Pero la sesión <strong>sí se guardó</strong>: presiona <kbd>F12</kbd> → pestaña <em>Application</em> (Aplicación) → <em>Session Storage</em> → verás <code>onboarding.session</code> con la persona elegida.</li>
</ol>
<h3>Si algo falla</h3>
<table class="grid">
  <tr><th>Si ves…</th><th>Solución</th></tr>
  <tr><td>«Data source not found… Failed to load Dataverse database references»</td><td>Abriste el enlace con otra cuenta. Usa una ventana de incógnito o el perfil del navegador de tu cuenta universitaria.</td></tr>
  <tr><td>«No hay personas con el rol…»</td><td>No hay roles cargados: ejecuta <code>npm run seed</code> en <code>dataverse-schema-tool</code>.</td></tr>
  <tr><td>Pantalla en blanco</td><td><kbd>F12</kbd> → pestaña Console: lee el error en rojo. Suele ser un nombre mal escrito en un <code>import</code>.</td></tr>
  <tr><td>Texto subrayado en rojo en VSCode</td><td>Pasa el mouse encima para ver qué espera TypeScript. Compara con la carpeta <code>solucion</code>.</td></tr>
</table>`,
  check: ['Ves la pantalla con los tres perfiles.', 'Al abrir un perfil aparecen las personas de Dataverse.', 'Encontraste la sesión guardada en Session Storage.'],
});

add({
  section: 'Probar',
  title: 'Resumen: el camino completo',
  kind: 'intro',
  body: `
<p>Esto es lo que pasa desde que abres la app hasta que ves la lista de personas:</p>
<ol class="flow">
  <li><code>index.html</code> carga <code>main.tsx</code>.</li>
  <li><code>main.tsx</code> carga los estilos y dibuja <code>App</code> en el <code>div#root</code>.</li>
  <li><code>App</code> envuelve todo con la <strong>sesión</strong> y el <strong>router</strong>.</li>
  <li>El router ve la dirección <code>#/</code> y dibuja <code>RoleSelectPage</code>.</li>
  <li><code>RoleSelectPage</code> recorre <code>roleModules</code> y dibuja los tres perfiles.</li>
  <li>Al hacer clic en uno, cambia el estado <code>openRole</code> y se dibuja <code>RolePeopleList</code>.</li>
  <li><code>RolePeopleList</code> usa <code>useAsync</code>, que llama a <code>listPeopleWithRole</code>.</li>
  <li>El servicio usa <code>ContactsService</code> y <code>Jsi_roleassignmentsService</code> (generados) → Dataverse.</li>
  <li>Llegan los datos: se dibujan las personas con su <code>Avatar</code>.</li>
  <li>Al elegir una, <code>signIn</code> guarda la sesión y <code>navigate</code> cambia la dirección.</li>
</ol>
<h3>Ejercicios</h3>
<ol>
  <li>Cambia el subtítulo «Seleccione el perfil…» por otro texto.</li>
  <li>En <code>RolePeopleList</code>, muestra el <code>id</code> debajo del cargo; luego quítalo.</li>
  <li>En <code>listPeopleWithRole</code>, ordena de la Z a la A (pista: intercambia <code>a</code> y <code>b</code> en el <code>sort</code>).</li>
  <li>Cambia <code>--color-primary</code> en global.css a verde (<code>#15803d</code>) y mira qué cambia. Luego vuelve al azul.</li>
  <li>Sin mirar, explica en voz alta los 10 pasos de arriba.</li>
</ol>
<div class="note"><strong>Parte 2:</strong> la barra lateral y la barra superior de cada rol, la protección de pantallas por rol y cerrar sesión.</div>`,
});

// =============================================================================
// HTML
// =============================================================================
const screenshot = `data:image/png;base64,${fs.readFileSync(path.join(ROOT, 'docs/assets/pantalla-inicio.png')).toString('base64')}`;
const createdUntil = steps.map((step) => (step.files ?? []).map((f) => f.path.split('  ')[0]));
const data = {
  tree: TREE,
  steps: steps.map((s, i) => ({
    ...s,
    body: s.body?.replace('__SCREENSHOT__', screenshot),
    created: createdUntil.slice(0, i + 1).flat(),
  })),
};

const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tutorial · Parte 1 · De cero a la pantalla de inicio</title>
<style>
  :root { --brand:#1d4ed8; --ink:#0f172a; --muted:#64748b; --line:#e2e8f0; --bg:#f3f5f9; --surface:#fff; --side:#0f1b33; }
  * { box-sizing:border-box; }
  html, body { margin:0; height:100%; }
  body { font-family:'Segoe UI',system-ui,sans-serif; color:var(--ink); background:var(--bg); display:grid; grid-template-columns:300px 1fr; }
  aside { background:var(--side); color:#cbd5e1; overflow-y:auto; padding:16px 12px; }
  aside h1 { color:#fff; font-size:15px; margin:0 6px 2px; }
  aside .sub { font-size:12px; margin:0 6px 14px; color:#8a9bb8; }
  .sec { font-size:10.5px; letter-spacing:.08em; text-transform:uppercase; color:#8a9bb8; margin:14px 6px 4px; }
  .nav button { display:flex; gap:8px; width:100%; padding:6px 8px; border:0; border-radius:6px; background:transparent; color:inherit; text-align:left; font:inherit; font-size:13px; cursor:pointer; }
  .nav button:hover { background:#1b2a47; }
  .nav button.on { background:var(--brand); color:#fff; }
  .nav button.done .n { background:#15803d; color:#fff; }
  .nav .n { flex-shrink:0; width:20px; height:20px; border-radius:50%; background:#1e2b45; display:grid; place-items:center; font-size:10.5px; }
  .tree { margin:18px 6px 0; padding:10px; border-radius:8px; background:#0b1428; font-family:Consolas,monospace; font-size:11px; line-height:1.6; }
  .tree div { color:#475569; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .tree div.ok { color:#86efac; } .tree div.new { color:#fde047; font-weight:700; }
  main { overflow-y:auto; display:flex; flex-direction:column; }
  .bar { height:4px; background:var(--line); } .bar span { display:block; height:100%; background:var(--brand); transition:width .3s; }
  .content { max-width:1000px; width:100%; margin:0 auto; padding:26px 32px 110px; }
  .crumb { color:var(--brand); font-weight:700; font-size:12px; letter-spacing:.06em; text-transform:uppercase; }
  h2 { font-size:26px; margin:4px 0 14px; }
  h3 { margin:18px 0 8px; }
  p, li { line-height:1.6; }
  code { font-family:Consolas,monospace; font-size:.9em; background:#e8edf5; padding:1px 5px; border-radius:4px; }
  kbd { border:1px solid var(--line); border-bottom-width:2px; border-radius:4px; padding:0 5px; background:#fff; font-size:.85em; }
  pre.tree, pre.term { background:#0f172a; color:#e2e8f0; border-radius:10px; padding:12px 16px; font-family:Consolas,monospace; font-size:13px; line-height:1.6; overflow-x:auto; margin:10px 0; }
  pre.tree { background:#fff; color:var(--ink); border:1px solid var(--line); }
  pre.term::before { content:'PowerShell'; display:block; color:#64748b; font-size:11px; margin-bottom:4px; }
  .file { margin:16px 0 22px; border:1px solid var(--line); border-radius:12px; background:var(--surface); overflow:hidden; }
  .file__head { display:flex; align-items:center; gap:10px; padding:9px 14px; background:#1e293b; color:#e2e8f0; font-family:Consolas,monospace; font-size:13px; }
  .file__head .copy { margin-left:auto; border:0; border-radius:6px; padding:4px 10px; background:#334155; color:#fff; cursor:pointer; font:inherit; font-size:12px; }
  .file__head .copy:hover { background:var(--brand); }
  .file__body { display:grid; grid-template-columns:minmax(0,1.25fr) minmax(0,1fr); }
  .code { background:#0f172a; color:#e2e8f0; font-family:Consolas,'Cascadia Mono',monospace; font-size:12.5px; line-height:1.55; overflow-x:auto; padding:10px 0; }
  .code div { display:flex; padding-right:12px; white-space:pre; }
  .code div.hl { background:#1e3a8a; }
  .code .ln { flex-shrink:0; width:42px; padding-right:12px; text-align:right; color:#475569; user-select:none; }
  .notes { padding:10px 12px; max-height:640px; overflow-y:auto; border-left:1px solid var(--line); }
  .notes .note-i { display:flex; gap:8px; padding:7px 8px; border-radius:8px; font-size:13.5px; line-height:1.5; cursor:default; }
  .notes .note-i:hover { background:#eef3ff; }
  .notes .tag { flex-shrink:0; height:20px; padding:0 6px; border-radius:6px; background:#e8edf5; font-family:Consolas,monospace; font-size:11px; display:grid; place-items:center; color:var(--brand); font-weight:700; }
  .k{color:#c084fc}.s{color:#86efac}.c{color:#64748b;font-style:italic}.n{color:#fdba74}.f{color:#93c5fd}.t{color:#5eead4}
  .note, .concept, .db, .check { border-radius:10px; padding:10px 14px; margin:12px 0; }
  .note { background:#eef3ff; border-left:4px solid var(--brand); } .note.warn { background:#fef6e0; border-left-color:#ca8a04; }
  .concept { background:#f5f8ff; border:1px solid #c7d7fb; }
  .db { background:#fffbeb; border:1px solid #fde68a; }
  .check { background:#f0fdf4; border:1px solid #bbf7d0; } .check ul { list-style:none; padding-left:0; margin:4px 0 0; }
  .check label { cursor:pointer; } .check input { margin-right:8px; accent-color:#15803d; }
  .concept__title, .db__title, .check__title { font-weight:700; margin-bottom:4px; }
  .shot { margin:12px 0; border:1px solid var(--line); border-radius:12px; overflow:hidden; max-width:640px; background:#fff; }
  .shot img { display:block; width:100%; } .shot figcaption { padding:8px 12px; font-size:13px; color:var(--muted); border-top:1px solid var(--line); }
  table.grid { border-collapse:collapse; width:100%; margin:10px 0; background:#fff; font-size:14px; }
  table.grid th, table.grid td { border:1px solid var(--line); padding:7px 10px; text-align:left; vertical-align:top; }
  table.grid th { background:#f8fafc; }
  .nav-btns { position:fixed; bottom:0; left:300px; right:0; display:flex; justify-content:space-between; align-items:center; padding:12px 32px; background:rgba(255,255,255,.95); border-top:1px solid var(--line); }
  .nav-btns button { border:0; border-radius:8px; padding:10px 18px; font:inherit; font-weight:600; cursor:pointer; }
  .prev { background:#e8edf5; color:var(--ink); } .next { background:var(--brand); color:#fff; }
  .nav-btns button:disabled { opacity:.4; cursor:default; }
  .count { color:var(--muted); font-size:13px; }
  @media (max-width: 1000px) { .file__body { grid-template-columns:1fr; } .notes { border-left:0; border-top:1px solid var(--line); max-height:none; } }
  @media (max-width: 760px) { body { grid-template-columns:1fr; } aside { display:none; } .nav-btns { left:0; } .content { padding:18px 16px 110px; } }
</style></head><body>
<aside>
  <h1>Tutorial · Parte 1</h1>
  <p class="sub">De cero a la pantalla de inicio</p>
  <nav class="nav" id="nav"></nav>
  <div class="sec">Archivos creados</div>
  <div class="tree" id="tree"></div>
</aside>
<main id="main">
  <div class="bar"><span id="bar"></span></div>
  <div class="content" id="content"></div>
</main>
<div class="nav-btns"><button class="prev" id="prev">← Anterior</button><span class="count" id="count"></span><button class="next" id="next">Siguiente →</button></div>
<script>
const DATA = ${JSON.stringify(data).replace(/</g, '\\u003c')};
const KEY = 'tutorial-parte-1-paso';
let current = 0;
try { current = Math.min(DATA.steps.length - 1, Number(localStorage.getItem(KEY)) || 0); } catch (e) {}

const $ = (id) => document.getElementById(id);

function renderNav() {
  let html = '', last = '';
  DATA.steps.forEach((s, i) => {
    if (s.section !== last) { html += '<div class="sec">' + s.section + '</div>'; last = s.section; }
    html += '<button data-i="' + i + '" class="' + (i === current ? 'on' : i < current ? 'done' : '') + '"><span class="n">' + (i + 1) + '</span><span>' + s.title + '</span></button>';
  });
  $('nav').innerHTML = html;
  $('nav').querySelectorAll('button').forEach((b) => (b.onclick = () => go(Number(b.dataset.i))));
  const created = new Set(DATA.steps[current].created);
  const fresh = new Set((DATA.steps[current].files || []).map((f) => f.path.split('  ')[0]));
  $('tree').innerHTML = DATA.tree.map((f) => '<div class="' + (fresh.has(f) ? 'new' : created.has(f) ? 'ok' : '') + '">' + (fresh.has(f) ? '● ' : created.has(f) ? '✓ ' : '○ ') + f + '</div>').join('');
}

function fileHtml(file, fi) {
  const code = file.lines.map((l, i) => '<div data-l="' + (i + 1) + '"><span class="ln">' + (i + 1) + '</span><span>' + l + '</span></div>').join('');
  const notes = file.notes.map((n) => '<div class="note-i" data-from="' + n.from + '" data-to="' + n.to + '"><span class="tag">' + (n.from === n.to ? n.from : n.from + '–' + n.to) + '</span><span>' + n.t + '</span></div>').join('');
  return '<div class="file" data-f="' + fi + '"><div class="file__head">📄 ' + file.path + '<button class="copy" data-f="' + fi + '">Copiar</button></div>' +
    '<div class="file__body"><div class="code">' + code + '</div><div class="notes">' + (notes || '<p>Sin notas.</p>') + '</div></div></div>';
}

function render() {
  const s = DATA.steps[current];
  let html = '<div class="crumb">Paso ' + (current + 1) + ' de ' + DATA.steps.length + ' · ' + s.section + '</div><h2>' + s.title + '</h2>';
  if (s.intro) html += s.intro;
  if (s.body) html += s.body;
  (s.files || []).forEach((f, i) => (html += fileHtml(f, i)));
  if (s.db) html += '<div class="db"><div class="db__title">🗄️ Con bases de datos…</div>' + s.db + '</div>';
  if (s.check) html += '<div class="check"><div class="check__title">✅ Comprueba antes de seguir</div><ul>' + s.check.map((c) => '<li><label><input type="checkbox">' + c + '</label></li>').join('') + '</ul></div>';
  $('content').innerHTML = html;
  $('main').scrollTop = 0;
  $('bar').style.width = ((current + 1) / DATA.steps.length) * 100 + '%';
  $('count').textContent = (current + 1) + ' / ' + DATA.steps.length;
  $('prev').disabled = current === 0;
  $('next').disabled = current === DATA.steps.length - 1;
  renderNav();

  // Resaltar la línea al pasar sobre su explicación
  document.querySelectorAll('.file').forEach((fileEl) => {
    fileEl.querySelectorAll('.note-i').forEach((n) => {
      const from = Number(n.dataset.from), to = Number(n.dataset.to);
      const lines = [...fileEl.querySelectorAll('.code div')].filter((d) => { const l = Number(d.dataset.l); return l >= from && l <= to; });
      n.onmouseenter = () => { lines.forEach((d) => d.classList.add('hl')); lines[0] && lines[0].scrollIntoView({ block: 'nearest' }); };
      n.onmouseleave = () => lines.forEach((d) => d.classList.remove('hl'));
    });
  });
  // Copiar el código
  document.querySelectorAll('.copy').forEach((b) => {
    b.onclick = async () => {
      const text = [...b.closest('.file').querySelectorAll('.code div')].map((d) => d.lastChild.textContent).join('\\n');
      try { await navigator.clipboard.writeText(text); b.textContent = '¡Copiado!'; } catch (e) { b.textContent = 'Selecciónalo a mano'; }
      setTimeout(() => (b.textContent = 'Copiar'), 1500);
    };
  });
}

function go(i) {
  current = Math.max(0, Math.min(DATA.steps.length - 1, i));
  try { localStorage.setItem(KEY, String(current)); } catch (e) {}
  render();
}
$('prev').onclick = () => go(current - 1);
$('next').onclick = () => go(current + 1);
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  if (e.key === 'ArrowRight') go(current + 1);
  if (e.key === 'ArrowLeft') go(current - 1);
});
render();
</script>
</body></html>`;

fs.writeFileSync(OUT, html);
console.log(`Tutorial generado: ${path.relative(ROOT, OUT)} · ${steps.length} pasos · ${steps.reduce((n, s) => n + (s.files?.length ?? 0), 0)} archivos explicados`);
