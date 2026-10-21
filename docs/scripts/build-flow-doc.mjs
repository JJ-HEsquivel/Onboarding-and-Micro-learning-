// Genera el HTML del documento "Flujo de registro del colaborador" con fragmentos REALES del código.
// Uso (desde la raíz del proyecto):
//   node docs/scripts/build-flow-doc.mjs . docs/flujo-registro-colaborador.html
// Luego abrir el HTML en el navegador y "Imprimir → Guardar como PDF" (o usar Edge/Chrome en modo --headless --print-to-pdf).
import fs from 'node:fs';
import { BASE_CSS, createKit } from './doc-kit.mjs';

const root = process.argv[2];
const out = process.argv[3];
const { snippet, code } = createKit(root);

// ---------- Fragmentos ----------
const S = {
  generatedCreate: snippet('src/generated/services/ContactsService.ts', /public static async create/, /^  }$/),
  unwrap: snippet('src/services/dataverse.ts', /^\/\*\*$/, /^}$/, { skip: 1 }),
  bind: snippet('src/services/dataverse.ts', /^ \* Valor para asignar una columna de búsqueda/, /^}$/, { back: 1 }),
  areaRoute: snippet('src/services/onboardingRoute.service.ts', /^export function buildAreaRoute/, /^}$/),
  proposed: snippet('src/services/onboardingRoute.service.ts', /^\/\*\* Documentos que el Admin propone/, /^}$/),
  modalRoute: snippet('src/modules/admin/pages/collaborators/components/RegisterCollaboratorModal.tsx', /Todas las etapas del área y, dentro de ellas/, /const proposedIds = useMemo/),
  modalSubmit: snippet('src/modules/admin/pages/collaborators/components/RegisterCollaboratorModal.tsx', /const handleSubmit = async/, /^  };$/),
  regStart: snippet('src/services/collaborators.service.ts', /^export async function registerCollaborator/, /undo\.push\(\(\) => ContactsService\.delete/),
  regRoleOnboarding: snippet('src/services/collaborators.service.ts', /const role = unwrap\(/, /undo\.push\(\(\) => Jsi_onboardingsService\.delete/),
  regAssignments: snippet('src/services/collaborators.service.ts', /const assignments = route\.flatMap/, /^}$/),
  pendingQuery: snippet('src/services/validation.service.ts', /^export async function loadPendingValidations/, /orderBy: \['createdon asc'\]/),
  validateSelection: snippet('src/services/validation.service.ts', /^export function validateSelection/, /^}$/),
  cardEditable: snippet('src/modules/manager/pages/pending-validation/components/PendingValidationCard.tsx', /\{areaRoute\.map\(\(stage\) => \{/, /disabled=\{!editable \|\| saving\}/),
  confirm: snippet('src/services/validation.service.ts', /^export async function confirmOnboarding/, /^}$/),
  dueDates: snippet('src/services/onboardingRoute.service.ts', /^export function computeStageDueDates/, /^}$/),
  progress: snippet('src/shared/domain/onboardingProgress.ts', /^export function computeProgress/, /^}$/),
  overviewStatus: snippet('src/services/collaborators.service.ts', /const entries = onboarding \? \(routes\.get/, /const managerName = /),
  myPending: snippet('src/services/myInduction.service.ts', /if \(onboarding\.jsi_validationstatus === VALIDATION_STATUS\.PendingValidation\)/, /^  }$/),
  guard: snippet('src/layouts/AppLayout/AppLayout.tsx', /Solo se entra a las pantallas de un rol/, /^  }$/),
};

// ---------- Diagramas (SVG) ----------
const layersSvg = `
<svg viewBox="0 0 760 300" class="diagram" role="img" aria-label="Capas de la aplicación">
  <defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#475569"/></marker></defs>
  ${[
    ['Pantalla (React)', 'src/modules/…/pages · components', 'Lo que ve y toca el usuario', '#e8efff', '#1d4ed8'],
    ['Servicio de dominio', 'src/services/*.service.ts', 'Reglas del negocio y traducción de columnas', '#e7f6ec', '#15803d'],
    ['Servicio generado', 'src/generated/services (PAC)', 'create · get · getAll · update · delete', '#fef6e0', '#a16207'],
    ['SDK de Power Apps', '@microsoft/power-apps/data', 'Autenticación y llamadas a la Web API', '#f1f5f9', '#475569'],
    ['Dataverse', 'Tablas jsi_* y contact', 'Donde se guardan los datos', '#fdecec', '#b91c1c'],
  ].map(([t, sub, d, bg, fg], i) => `
    <g transform="translate(${20 + i * 148},40)">
      <rect width="128" height="150" rx="12" fill="${bg}" stroke="${fg}" stroke-width="1.5"/>
      <text x="64" y="30" text-anchor="middle" font-weight="700" font-size="13" fill="${fg}">${t.split(' (')[0]}</text>
      ${t.includes('(') ? `<text x="64" y="47" text-anchor="middle" font-size="11" fill="${fg}">(${t.split(' (')[1]}</text>` : ''}
      <foreignObject x="8" y="58" width="112" height="90"><div xmlns="http://www.w3.org/1999/xhtml" class="svgtext"><code>${sub}</code><br/>${d}</div></foreignObject>
    </g>
    ${i < 4 ? `<line x1="${148 + i * 148}" y1="115" x2="${168 + i * 148}" y2="115" stroke="#475569" stroke-width="2" marker-end="url(#arr)"/>` : ''}
  `).join('')}
  <text x="380" y="230" text-anchor="middle" font-size="12" fill="#334155">Cada capa solo habla con la de al lado: la pantalla nunca llama a Dataverse directamente.</text>
  <text x="380" y="252" text-anchor="middle" font-size="12" fill="#334155">Los datos vuelven por el mismo camino (en sentido contrario) ya convertidos a modelos simples.</text>
</svg>`;

// Modelo ER de las tablas que participan en el flujo
const T = {
  area: { x: 20, y: 30, title: 'jsi_area', rows: ['jsi_areaid (PK)', 'jsi_name', 'jsi_code'] },
  contact: { x: 270, y: 20, title: 'contact (persona)', rows: ['contactid (PK)', 'fullname · emailaddress1', 'jsi_jobtitle · jsi_hiredate', 'jsi_area (FK)', 'jsi_manager (FK → contact)'] },
  role: { x: 540, y: 20, title: 'jsi_roleassignment', rows: ['jsi_roleassignmentid (PK)', 'jsi_person (FK)', 'jsi_role · jsi_isactive', 'jsi_assignedby (FK)'] },
  onboarding: { x: 270, y: 200, title: 'jsi_onboarding (inducción)', rows: ['jsi_onboardingid (PK)', 'jsi_employee (FK)', 'jsi_validator (FK)', 'jsi_registeredby (FK)', 'jsi_area (FK)', 'jsi_validationstatus', 'jsi_progressstatus · jsi_risklevel'] },
  stage: { x: 20, y: 200, title: 'jsi_stage', rows: ['jsi_stageid (PK)', 'jsi_name · jsi_order', 'jsi_scope', 'jsi_businessdaysdeadline'] },
  stagearea: { x: 20, y: 120, title: 'jsi_stagearea', rows: ['jsi_stage (FK)', 'jsi_area (FK)'] },
  docassign: { x: 270, y: 410, title: 'jsi_documentassignment', rows: ['jsi_employee (FK)', 'jsi_document (FK)', 'jsi_stage (FK)', 'jsi_onboarding (FK)', 'jsi_status · jsi_duedate'] },
  document: { x: 20, y: 360, title: 'jsi_document', rows: ['jsi_documentid (PK)', 'jsi_code · jsi_title', 'jsi_stage (FK)', 'jsi_isdefault · jsi_content'] },
  assessment: { x: 20, y: 500, title: 'jsi_assessment', rows: ['jsi_assessmentid (PK)', 'jsi_document (FK)', 'jsi_type = Document'] },
  examassign: { x: 540, y: 410, title: 'jsi_assessmentassignment', rows: ['jsi_employee (FK)', 'jsi_assessment (FK)', 'jsi_onboarding (FK)', 'jsi_status · jsi_attemptsused'] },
  evidence: { x: 540, y: 220, title: 'jsi_evidence', rows: ['jsi_employee (FK)', 'jsi_document (FK)', 'jsi_type · jsi_result'] },
};
const W = 200;
const H = (t) => 26 + t.rows.length * 17 + 6;
const created = new Set(['contact', 'role', 'onboarding', 'docassign']);
const validated = new Set(['examassign']);
function box(key) {
  const t = T[key];
  const color = created.has(key) ? '#1d4ed8' : validated.has(key) ? '#15803d' : '#64748b';
  return `<g transform="translate(${t.x},${t.y})">
    <rect width="${W}" height="${H(t)}" rx="8" fill="#fff" stroke="${color}" stroke-width="${created.has(key) || validated.has(key) ? 2 : 1.2}"/>
    <path d="M0 8a8 8 0 0 1 8-8h${W - 16}a8 8 0 0 1 8 8v16h-${W}z" fill="${color}"/>
    <text x="10" y="17" fill="#fff" font-size="12" font-weight="700">${t.title}</text>
    ${t.rows.map((r, i) => `<text x="10" y="${40 + i * 17}" font-size="11" fill="#0f172a">${r}</text>`).join('')}
  </g>`;
}
const mid = (k, side) => {
  const t = T[k];
  if (side === 'l') return [t.x, t.y + H(t) / 2];
  if (side === 'r') return [t.x + W, t.y + H(t) / 2];
  if (side === 't') return [t.x + W / 2, t.y];
  return [t.x + W / 2, t.y + H(t)];
};
const rel = (a, sa, b, sb, label) => {
  const [x1, y1] = mid(a, sa);
  const [x2, y2] = mid(b, sb);
  return `<path d="M${x1} ${y1} C${(x1 + x2) / 2} ${y1} ${(x1 + x2) / 2} ${y2} ${x2} ${y2}" fill="none" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#arr2)"/>
    ${label ? `<text x="${(x1 + x2) / 2 + 4}" y="${(y1 + y2) / 2 - 4}" font-size="10" fill="#475569">${label}</text>` : ''}`;
};
const erSvg = `
<svg viewBox="0 0 760 590" class="diagram" role="img" aria-label="Tablas que participan en el flujo">
  <defs><marker id="arr2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#94a3b8"/></marker></defs>
  ${rel('area', 'r', 'contact', 'l')}
  ${rel('contact', 'r', 'role', 'l')}
  ${rel('contact', 'b', 'onboarding', 't', 'employee / validator / registeredby')}
  ${rel('area', 'b', 'stagearea', 't')}
  ${rel('stage', 't', 'stagearea', 'b')}
  ${rel('stage', 'b', 'document', 't', 'etapa')}
  ${rel('document', 'b', 'assessment', 't', 'su examen')}
  ${rel('onboarding', 'b', 'docassign', 't', 'documentos de la inducción')}
  ${rel('document', 'r', 'docassign', 'l')}
  ${rel('onboarding', 'r', 'examassign', 't', 'exámenes')}
  ${rel('assessment', 'r', 'examassign', 'b')}
  ${rel('contact', 'r', 'evidence', 'l')}
  ${Object.keys(T).map(box).join('')}
</svg>`;

const flowSvg = `
<svg viewBox="0 0 760 170" class="diagram" role="img" aria-label="Flujo del registro">
  <defs><marker id="arr3" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#475569"/></marker></defs>
  ${[
    ['1. Admin registra', 'Colaboradores → Registrar', 'Por validar', '#fef6e0', '#a16207'],
    ['2. Manager valida', 'Nuevos por validar', 'Por iniciar', '#e8efff', '#1d4ed8'],
    ['3. Colaborador lee', 'Inducción → Leer y confirmar', 'En curso', '#e8efff', '#1d4ed8'],
    ['4. Aprueba exámenes', 'Inducción / Mis evaluaciones', 'Completado', '#e7f6ec', '#15803d'],
  ].map(([t, s, st, bg, fg], i) => `
    <g transform="translate(${10 + i * 190},20)">
      <rect width="170" height="110" rx="12" fill="${bg}" stroke="${fg}" stroke-width="1.5"/>
      <text x="85" y="34" text-anchor="middle" font-weight="700" font-size="14" fill="${fg}">${t}</text>
      <text x="85" y="58" text-anchor="middle" font-size="11" fill="#334155">${s}</text>
      <text x="85" y="88" text-anchor="middle" font-size="11" fill="#334155">Estado: </text>
      <text x="85" y="104" text-anchor="middle" font-size="12" font-weight="700" fill="${fg}">${st}</text>
    </g>
    ${i < 3 ? `<line x1="${182 + i * 190}" y1="75" x2="${198 + i * 190}" y2="75" stroke="#475569" stroke-width="2" marker-end="url(#arr3)"/>` : ''}
  `).join('')}
</svg>`;

const today = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());

// ---------- Documento ----------
const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>Flujo de registro del colaborador</title>
<style>${BASE_CSS}</style></head><body>

<section class="cover">
  <div class="cover__tag">Onboarding & Micro-learning · Jalasoft</div>
  <h1>Flujo de registro del colaborador</h1>
  <p class="cover__sub">Cómo se registra a un colaborador, cómo lo valida su Manager y qué cambia en cada pantalla y en cada tabla de Dataverse. Con el código real que lo hace posible.</p>
  <div class="toc"><strong>Contenido</strong><ol>
    <li>Arquitectura: cómo se conecta el frontend con Dataverse</li>
    <li>Las tablas que intervienen (modelo entidad-relación)</li>
    <li>Paso 1 · El Administrador registra al colaborador</li>
    <li>Qué cambia en cada pantalla después del registro</li>
    <li>Paso 2 · El Manager valida la ruta</li>
    <li>Qué cambia después de la validación</li>
    <li>Cómo se calcula el estado de cada colaborador</li>
    <li>Resumen y glosario</li>
  </ol></div>
  <p class="cover__meta">Generado el ${today} a partir del código fuente del proyecto. Tecnologías: Power Apps Code App (React + TypeScript + Vite) y Microsoft Dataverse.</p>
</section>

<h2>1. Arquitectura: cómo se conecta el frontend con Dataverse</h2>
<p>La aplicación es una <strong>Power Apps Code App</strong>: una página web hecha con React y TypeScript que corre dentro de Power Apps. No tiene un servidor propio: el “backend” es <strong>Dataverse</strong>, la base de datos de Power Platform, a la que se accede a través del SDK de Power Apps con la cuenta del usuario conectado.</p>
${layersSvg}
<table class="grid">
  <tr><th style="width:23%">Capa</th><th style="width:32%">Carpeta</th><th>Responsabilidad</th></tr>
  <tr><td>Pantalla</td><td><code>src/modules/&lt;rol&gt;/pages</code></td><td>Dibuja la interfaz, guarda el estado del formulario y llama a un servicio. No conoce nombres de columnas de Dataverse.</td></tr>
  <tr><td>Servicio de dominio</td><td><code>src/services</code></td><td>Aplica las reglas del negocio (qué documentos van en la ruta, qué se crea al registrar) y traduce columnas como <code>_jsi_area_value</code> a modelos simples (<code>Collaborator</code>, <code>RouteStage</code>).</td></tr>
  <tr><td>Servicio generado</td><td><code>src/generated</code></td><td>Lo genera el comando <code>pac code add-data-source</code>. Ofrece <code>create</code>, <code>get</code>, <code>getAll</code>, <code>update</code> y <code>delete</code> para cada tabla. No se edita a mano.</td></tr>
  <tr><td>SDK de Power Apps</td><td><code>@microsoft/power-apps</code></td><td>Envía las peticiones a la Web API de Dataverse con la sesión del usuario.</td></tr>
  <tr><td>Dataverse</td><td>Tablas <code>jsi_*</code> y <code>contact</code></td><td>Guarda los datos y aplica los permisos.</td></tr>
</table>

<h3>Ejemplo: el servicio generado para la tabla contact</h3>
<p>Así se ve un servicio que crea PAC. Recibe el registro y lo envía con <code>createRecordAsync</code>. La respuesta es un <code>IOperationResult</code>, que indica si salió bien (<code>success</code>) y trae los datos (<code>data</code>) o el error.</p>
${code(S.generatedCreate, 'Servicio generado por PAC: no se modifica; se regenera si cambian las columnas de la tabla.')}

<h3>Dos ayudantes que usan todos los servicios</h3>
<p><code>unwrap</code> convierte el resultado en datos o en un error con un mensaje claro, y <code>bind</code> arma el valor para llenar una columna de búsqueda (un “lookup”, es decir, una clave foránea).</p>
${code(S.unwrap)}
${code(S.bind, 'Para relacionar registros, Dataverse espera "/entitySet(id)" en una propiedad terminada en @odata.bind.')}

<div class="page"></div>
<h2>2. Las tablas que intervienen</h2>
<p>El modelo separa tres conceptos: la <strong>persona</strong> (<code>contact</code>, existe una sola vez), sus <strong>roles</strong> (<code>jsi_roleassignment</code>, puede tener varios: Administrador, Manager, Colaborador) y cada <strong>inducción</strong> (<code>jsi_onboarding</code>). Así, cuando un colaborador asciende a Manager, su inducción queda como historial.</p>
<div class="legend"><span style="--c:#1d4ed8">Se crean al registrar</span><span style="--c:#15803d">Se crean al validar</span><span style="--c:#64748b">Catálogo (ya existen)</span></div>
${erSvg}
<table class="grid">
  <tr><th style="width:28%">Tabla</th><th>Para qué sirve en este flujo</th></tr>
  <tr><td><code>contact</code></td><td>La persona: nombre, correo (único), cargo, fecha de ingreso, área y su Manager directo (<code>jsi_manager</code>).</td></tr>
  <tr><td><code>jsi_roleassignment</code></td><td>Su rol activo. Al registrar se crea el rol <em>Collaborator</em>; con él aparece en el inicio de sesión como colaborador.</td></tr>
  <tr><td><code>jsi_onboarding</code></td><td>La inducción: quién la valida (<code>jsi_validator</code>), quién la registró (<code>jsi_registeredby</code>), el área cuya ruta se usó y su estado (<code>jsi_validationstatus</code>, <code>jsi_progressstatus</code>, <code>jsi_risklevel</code>).</td></tr>
  <tr><td><code>jsi_documentassignment</code></td><td>Un documento de su ruta: estado de lectura (<em>Pending</em> / <em>Read</em>) y vencimiento.</td></tr>
  <tr><td><code>jsi_assessmentassignment</code></td><td>El examen de cada documento: <em>Locked</em> → <em>Pending</em> → <em>Passed</em> / <em>Failed</em>, con intentos usados.</td></tr>
  <tr><td><code>jsi_stage</code>, <code>jsi_stagearea</code>, <code>jsi_document</code>, <code>jsi_assessment</code></td><td>Catálogo: las etapas (1 y 2 generales, una Etapa 3 por área), los documentos con su contenido y la evaluación de cada documento.</td></tr>
</table>
<p class="note">El modelo completo (23 tablas y 41 relaciones) está en <code>docs/modelo-entidad-relacion.md</code> y su diagrama interactivo en <code>docs/modelo-er-grafico.html</code>.</p>

<div class="page"></div>
<h2>3. Paso 1 · El Administrador registra al colaborador</h2>
${flowSvg}
<p><strong>Dónde:</strong> el Administrador entra por el selector de inicio, va a <strong>Colaboradores</strong> y pulsa <strong>Registrar colaborador</strong>. Completa nombres, apellidos, correo, cargo, área, Manager responsable y fecha de ingreso.</p>

<h3>3.1 La ruta propuesta se calcula en el navegador</h3>
<p>Al elegir el área, el formulario arma la ruta con el catálogo ya leído de Dataverse. Primero <code>buildAreaRoute</code> junta todas las etapas que aplican al área: las generales (1 y 2) y la Etapa 3 de esa área.</p>
${code(S.areaRoute)}
<p>Después <code>proposedDocumentIds</code> decide qué documentos se asignan: todos los de las etapas generales y, de la Etapa 3, solo los marcados como “por defecto” (<code>jsi_isdefault</code>). Los demás quedan como opcionales para el Manager.</p>
${code(S.proposed)}
${code(S.modalRoute, 'En la pantalla: useMemo recalcula la ruta solo cuando cambia el catálogo o el área elegida.')}

<h3>3.2 Al pulsar “Registrar”</h3>
<p>La pantalla valida el formulario y llama al servicio <code>registerCollaborator</code> con los datos, la ruta propuesta y el <strong>id del Administrador</strong> que está registrando (sale de la sesión).</p>
${code(S.modalSubmit)}

<h3>3.3 El servicio crea los registros en Dataverse</h3>
<p>Primero comprueba que el correo no exista (el correo identifica a la persona). Luego crea la <strong>persona</strong> en <code>contact</code>, con su área y su Manager como lookups.</p>
${code(S.regStart)}
<p>Después crea su <strong>rol</strong> de Colaborador y su <strong>inducción</strong>, pendiente de validación, con el Manager como validador y el Administrador como quien la registró.</p>
${code(S.regRoleOnboarding)}
<p>Por último asigna los <strong>documentos</strong> de la ruta propuesta. Si algo falla, recorre la lista <code>undo</code> en orden inverso y borra lo creado, para no dejar datos a medias.</p>
${code(S.regAssignments, 'Los exámenes todavía no se crean: se crean cuando el Manager confirma la ruta.')}

<h3>3.4 Resultado en la base de datos</h3>
<table class="grid">
  <tr><th style="width:28%">Tabla</th><th style="width:14%">Registros</th><th>Valores clave</th></tr>
  <tr><td><code>contact</code></td><td>1</td><td>firstname, lastname, emailaddress1 (en minúsculas), jsi_jobtitle, jsi_hiredate, jsi_area, jsi_manager</td></tr>
  <tr><td><code>jsi_roleassignment</code></td><td>1</td><td>jsi_role = <em>Collaborator</em>, jsi_isactive = Sí, jsi_startdate = fecha de ingreso</td></tr>
  <tr><td><code>jsi_onboarding</code></td><td>1</td><td>jsi_type = <em>Initial</em>, jsi_validationstatus = <em>PendingValidation</em>, jsi_progressstatus = <em>NotStarted</em>, jsi_risklevel = <em>Low</em>, jsi_validator, jsi_registeredby</td></tr>
  <tr><td><code>jsi_documentassignment</code></td><td>Uno por documento propuesto (ej. 14 en Engineering)</td><td>jsi_status = <em>Pending</em>, jsi_source = “Propuesto por el Administrador”, sin vencimiento todavía</td></tr>
</table>

<div class="page"></div>
<h2>4. Qué cambia en cada pantalla después del registro</h2>
<p>Ninguna pantalla guarda copias de los datos: cada una vuelve a leer Dataverse al abrirse. Por eso el nuevo registro aparece en todas, cada una con lo que le corresponde a su rol.</p>
<div class="two">
  <div class="screen"><div class="who">Administrador</div><h4>Colaboradores</h4><p>Aparece en la tabla con estado <span class="badge b-warn">Por validar</span>, documentos 0/14 y su Manager. Sube el contador “pendientes de validación”.</p></div>
  <div class="screen"><div class="who">Administrador</div><h4>Panel general</h4><p>Entra en “Colaboradores que requieren atención” con el motivo <em>Pendiente de validación de &lt;Manager&gt;</em>, y en la barra “Estado de las inducciones”.</p></div>
  <div class="screen"><div class="who">Administrador</div><h4>Managers y ascensos</h4><p>Aparece como candidato con el motivo <em>Su ruta aún no fue validada</em>: todavía no se lo puede ascender. Suma 1 en “Por validar” del equipo de su Manager.</p></div>
  <div class="screen"><div class="who">Manager</div><h4>Panel del equipo</h4><p>Muestra el aviso <em>Se le asignó un nuevo colaborador para validar</em> con el botón <strong>Revisar y validar</strong>.</p></div>
  <div class="screen"><div class="who">Manager</div><h4>Nuevos por validar</h4><p>Aparece la tarjeta del colaborador con su área, fecha de ingreso, correo y <strong>Registrado por</strong> (el Administrador), y su ruta por etapa.</p></div>
  <div class="screen"><div class="who">Colaborador</div><h4>Inicio de sesión y Mi progreso</h4><p>Ya puede elegirse en el inicio como Colaborador. Al entrar ve <em>Su ruta de inducción todavía no está activa</em> y la documentación propuesta en gris.</p></div>
</div>

<h3>4.1 Cómo sabe cada pantalla qué mostrar</h3>
<p>La pantalla del Administrador calcula el estado de cada colaborador en <code>loadCollaboratorsOverview</code>: si su inducción está pendiente de validación, el estado es <em>pendingValidation</em> (“Por validar”); si no, se calcula con su ruta real.</p>
${code(S.overviewStatus)}
<p>El colaborador, en cambio, recibe una respuesta distinta según el estado de su inducción. Si está pendiente, solo se le muestran los documentos propuestos:</p>
${code(S.myPending)}
<p>Además, cada rol solo puede abrir sus propias pantallas: el layout comprueba la sesión antes de dibujar.</p>
${code(S.guard)}

<div class="page"></div>
<h2>5. Paso 2 · El Manager valida la ruta</h2>
<p><strong>Dónde:</strong> el Manager entra con su usuario, va a <strong>Nuevos por validar</strong> y ve una tarjeta por cada colaborador que le toca validar. La consulta filtra por <code>jsi_validator</code> = el Manager con sesión y por estado <em>PendingValidation</em>:</p>
${code(S.pendingQuery)}

<h3>5.1 Qué puede cambiar el Manager</h3>
<p>Las Etapas 1 y 2 aparecen tildadas y bloqueadas (“Fija”). Solo la Etapa 3 de su área es editable: puede quitar los documentos que envió el Administrador o sumar los demás del área.</p>
${code(S.cardEditable, 'La casilla se desactiva cuando la etapa no es editable (etapas generales).')}
<p>Antes de confirmar se controla que quede al menos un documento de la Etapa 3:</p>
${code(S.validateSelection)}

<h3>5.2 Al pulsar “Confirmar y activar ruta”</h3>
${code(S.confirm)}
<p>Los vencimientos se acumulan por etapa: si la Etapa 1 tiene 5 días hábiles y la Etapa 2 otros 5, la primera vence a los 5 y la segunda a los 10 días hábiles desde el inicio.</p>
${code(S.dueDates)}

<h3>5.3 Resultado en la base de datos</h3>
<table class="grid">
  <tr><th style="width:30%">Tabla</th><th>Cambio</th></tr>
  <tr><td><code>jsi_documentassignment</code></td><td>Se borran los documentos destildados, se crean los sumados (jsi_source = “Agregado por el Manager”) y todos reciben su <strong>jsi_duedate</strong>.</td></tr>
  <tr><td><code>jsi_assessmentassignment</code></td><td>Se crea <strong>un examen por documento</strong> con jsi_status = <em>Locked</em> y 0 intentos usados. Se desbloquea cuando el colaborador confirma la lectura.</td></tr>
  <tr><td><code>jsi_onboarding</code></td><td>jsi_validationstatus = <em>Validated</em> y jsi_validatedon = fecha y hora de la validación. Se actualiza al final, para que la ruta solo se active si todo lo anterior salió bien.</td></tr>
</table>

<h2>6. Qué cambia después de la validación</h2>
<table class="grid">
  <tr><th style="width:26%">Pantalla</th><th>Antes</th><th>Después</th></tr>
  <tr><td>Admin · Colaboradores</td><td><span class="badge b-warn">Por validar</span></td><td><span class="badge b-neutral">Por iniciar</span>, con 0/N documentos y vencimientos</td></tr>
  <tr><td>Manager · Nuevos por validar</td><td>Tarjeta del colaborador</td><td>Desaparece (ya no está pendiente). Aviso de éxito.</td></tr>
  <tr><td>Manager · Panel / Colaboradores</td><td>Aviso “nuevo colaborador”</td><td>Pasa a la tabla de avance con el botón <strong>Recordar</strong>.</td></tr>
  <tr><td>Colaborador · Mi progreso</td><td>“Su ruta todavía no está activa”</td><td>Fase 2 en curso, anillo de avance y “Continuar inducción”.</td></tr>
  <tr><td>Colaborador · Inducción</td><td>Documentos propuestos en gris</td><td>Lista “Por completar”: <strong>Leer y confirmar</strong> → <strong>Rendir examen</strong> → aprobado.</td></tr>
  <tr><td>Colaborador · Mis evaluaciones</td><td>—</td><td>Un examen por documento, <span class="badge b-neutral">Bloqueada</span> hasta confirmar la lectura.</td></tr>
</table>

<div class="page"></div>
<h2>7. Cómo se calcula el estado de cada colaborador</h2>
<p>El estado no se escribe a mano: se calcula siempre con la misma función pura a partir de su ruta real. La usan el Administrador, el Manager y el Colaborador, por eso los tres ven los mismos números.</p>
${code(S.progress)}
<table class="grid">
  <tr><th style="width:24%">Estado</th><th>Cuándo</th></tr>
  <tr><td><span class="badge b-warn">Por validar</span></td><td>La inducción está en <em>PendingValidation</em> (todavía no la confirmó el Manager).</td></tr>
  <tr><td><span class="badge b-neutral">Por iniciar</span></td><td>Validada, pero sin lecturas ni exámenes.</td></tr>
  <tr><td><span class="badge b-info">En curso</span></td><td>Tiene al menos una lectura o examen y le faltan documentos por aprobar.</td></tr>
  <tr><td><span class="badge b-danger">Atrasado</span></td><td>Tiene una lectura o un examen con la fecha de vencimiento pasada.</td></tr>
  <tr><td><span class="badge b-ok">Completado</span></td><td>Todos sus documentos están <strong>leídos y con el examen aprobado</strong> (mínimo 80%). Recién entonces el Administrador puede ascenderlo a Manager.</td></tr>
</table>

<h2>8. Resumen y glosario</h2>
<ol>
  <li><strong>Admin registra</strong> → se crean persona, rol, inducción y documentos propuestos. Estado “Por validar”.</li>
  <li><strong>Manager valida</strong> → ajusta la Etapa 3, se fijan vencimientos y se crean los exámenes. Estado “Por iniciar”.</li>
  <li><strong>Colaborador</strong> lee, confirma y aprueba cada examen → “En curso” → “Completado”.</li>
</ol>
<table class="grid">
  <tr><th style="width:24%">Término</th><th>Significado</th></tr>
  <tr><td>Lookup (FK)</td><td>Columna que apunta a otro registro (ej. jsi_area de un contacto). Al leerla llega como <code>_jsi_area_value</code>; al escribirla se usa <code>"jsi_Area@odata.bind"</code>.</td></tr>
  <tr><td>Choice</td><td>Columna de opciones con valores numéricos (ej. 100000001 = PendingValidation). Los valores están en <code>src/shared/constants/choices.ts</code>.</td></tr>
  <tr><td>PAC</td><td>Power Platform CLI. <code>pac code add-data-source</code> genera los modelos y servicios de cada tabla.</td></tr>
  <tr><td>Servicio de dominio</td><td>Archivo de <code>src/services</code> con las reglas del negocio; las pantallas solo hablan con estos servicios.</td></tr>
  <tr><td>Función pura</td><td>Función que solo calcula a partir de lo que recibe (sin leer ni guardar datos), como <code>computeProgress</code>. Es fácil de probar y siempre da el mismo resultado.</td></tr>
</table>
<p class="note warn">Las notificaciones por correo (bienvenida, recordatorios) todavía no se envían: la app guarda los avisos en <code>jsi_notification</code> y el envío se hará más adelante con Power Automate.</p>
</body></html>`;

fs.writeFileSync(out, html);
console.log('HTML generado:', out, `(${Object.keys(S).length} capturas de código)`);
