#!/usr/bin/env node
// =============================================================================
// seed-data.mjs
// Carga los datos BASE del sistema en Dataverse:
//   data/catalog.json -> áreas, categorías, etapas, etapa-área, documentos
//                        (con su contenido) y una evaluación por documento
//                        con sus preguntas y opciones.
//   data/people.json  -> personas base (administradores y managers) y sus roles.
//
// USO (dentro de la carpeta dataverse-schema-tool):
//   npm run seed:dry-run    (solo muestra qué haría)
//   npm run seed            (carga los datos)
//   npm run seed:people     (solo áreas, personas base y roles; no toca el catálogo)
//
// Es IDEMPOTENTE: se puede ejecutar varias veces. Busca cada registro por su
// nombre o código: si existe lo actualiza y si no, lo crea. Nunca duplica.
// Para empezar de cero, ejecute antes "npm run reset".
// =============================================================================
import fs from 'node:fs';
import { connect, getDataverseUrl } from './lib/dataverse-client.mjs';
import { createDataStore, q } from './lib/dataverse-data.mjs';

// Valores de las columnas Choice (ver schema.mjs)
const SCOPE = { General: 100000000, AreaSpecific: 100000001 };
const CRITICALITY = { High: 100000000, Medium: 100000001, Low: 100000002 };
const DOC_STATUS = { Current: 100000000 };
const ASSESSMENT_TYPE = { Document: 100000000 };
const ROLE = { Administrator: 100000000, Manager: 100000001, Collaborator: 100000002 };

// Reglas del programa (iguales a las de la app: src/shared/constants/program.ts)
const PASSING_SCORE = 80;
const MAX_ATTEMPTS = 3;

const readJson = (file) => JSON.parse(fs.readFileSync(new URL(file, import.meta.url), 'utf8'));
const catalog = readJson('./data/catalog.json');
const { people } = readJson('./data/people.json');

const DRY_RUN = process.argv.includes('--dry-run');
// Solo áreas, personas y roles (no toca el catálogo). Útil después de migrar a jsi_person.
const PEOPLE_ONLY = process.argv.includes('--people-only');
const DATAVERSE_URL = getDataverseUrl();

console.log('==================================================================');
console.log(' Onboarding and Micro-learning · Carga de datos base');
console.log(` Entorno: ${DATAVERSE_URL}`);
console.log(` Modo:    ${DRY_RUN ? 'DRY-RUN (no se escribe nada)' : 'EJECUCION REAL'}`);
console.log('==================================================================\n');

/** Contenido del lector: "## Título" + párrafo por cada sección. */
const toContent = (sections) => sections.map((s) => `## ${s.title}\n${s.body}`).join('\n\n');

async function main() {
  const api = await connect(DATAVERSE_URL);
  const who = await api('GET', 'WhoAmI');
  console.log(`Conexion OK con Dataverse (UserId: ${who.UserId}).\n`);
  const store = createDataStore(api, { dryRun: DRY_RUN });

  const stats = { create: 0, update: 0 };
  const tally = (result, label) => {
    stats[result.action]++;
    if (label) console.log(`   [${result.action === 'create' ? 'creado' : 'actualizado'}] ${label}`);
    return result;
  };

  // 1) Áreas
  console.log('--- 1/7 Areas ---');
  const areaId = {};
  for (const a of catalog.areas) {
    areaId[a.code] = tally(await store.upsert('jsi_area', `jsi_name eq '${q(a.name)}'`, { jsi_name: a.name, jsi_code: a.code }), a.name).id;
  }

  // 2) a 6) Catálogo: se omite con --people-only para no pisar lo editado desde la app.
  if (PEOPLE_ONLY) {
    console.log('\n(--people-only: se omiten categorías, etapas, documentos y evaluaciones)');
  } else {
    // 2) Categorías
    console.log('\n--- 2/7 Categorias ---');
    const categoryId = {};
    for (const name of catalog.categories) {
      categoryId[name] = tally(await store.upsert('jsi_documentcategory', `jsi_name eq '${q(name)}'`, { jsi_name: name }), name).id;
    }

    // 3) Etapas y a qué áreas aplica cada etapa específica
    console.log('\n--- 3/7 Etapas ---');
    const stageId = {};
    for (const s of catalog.stages) {
      const payload = {
        jsi_name: s.name,
        jsi_order: s.order,
        jsi_scope: SCOPE[s.scope],
        jsi_businessdaysdeadline: s.businessDays,
      };
      stageId[s.key] = tally(await store.upsert('jsi_stage', `jsi_name eq '${q(s.name)}'`, payload), s.name).id;
      for (const code of s.areas) {
        const filter = DRY_RUN ? `jsi_name eq 'dryrun-no-existe'` : `_jsi_stage_value eq ${stageId[s.key]} and _jsi_area_value eq ${areaId[code]}`;
        tally(await store.upsert('jsi_stagearea', filter, {}, [
          { attr: 'jsi_stage', target: 'jsi_stage', id: stageId[s.key] },
          { attr: 'jsi_area', target: 'jsi_area', id: areaId[code] },
        ]));
      }
    }

    // 4) Documentos
    console.log('\n--- 4/7 Documentos ---');
    const documentId = {};
    for (const d of catalog.documents) {
      const payload = {
        jsi_title: d.title,
        jsi_code: d.code,
        jsi_version: d.version,
        jsi_criticality: CRITICALITY[d.criticality],
        jsi_status: DOC_STATUS.Current,
        jsi_mandatory: true,
        jsi_isdefault: d.isDefault,
        jsi_pagecount: d.pages,
        jsi_readingminutes: d.minutes,
        jsi_owningdepartment: d.owner,
        jsi_summary: d.summary,
        jsi_content: toContent(d.sections),
        jsi_updatedon: d.updatedOn,
      };
      documentId[d.code] = tally(await store.upsert('jsi_document', `jsi_code eq '${q(d.code)}'`, payload, [
        { attr: 'jsi_stage', target: 'jsi_stage', id: stageId[d.stage] },
        { attr: 'jsi_category', target: 'jsi_documentcategory', id: categoryId[d.category] },
      ]), `${d.code}  ${d.title}`).id;
    }

    // 5) Una evaluación por documento
    console.log('\n--- 5/7 Evaluaciones (una por documento) ---');
    const assessmentId = {};
    for (const d of catalog.documents) {
      const filter = DRY_RUN ? `jsi_title eq 'dryrun-no-existe'` : `_jsi_document_value eq ${documentId[d.code]} and jsi_type eq ${ASSESSMENT_TYPE.Document}`;
      assessmentId[d.code] = tally(await store.upsert('jsi_assessment', filter, {
        jsi_title: `Evaluación · ${d.title}`,
        jsi_type: ASSESSMENT_TYPE.Document,
        jsi_durationminutes: Math.max(3, Math.ceil(d.questions.length * 1.5)),
        jsi_passingscore: PASSING_SCORE,
        jsi_maxattempts: MAX_ATTEMPTS,
        jsi_generatedby: 'Banco de preguntas del programa',
        jsi_date: d.updatedOn,
      }, [
        { attr: 'jsi_document', target: 'jsi_document', id: documentId[d.code] },
        { attr: 'jsi_stage', target: 'jsi_stage', id: stageId[d.stage] },
      ])).id;
    }
    console.log(`   ${catalog.documents.length} evaluaciones listas.`);

    // 6) Preguntas y opciones: se reemplazan completas si cambiaron
    console.log('\n--- 6/7 Preguntas y opciones ---');
    let replaced = 0;
    for (const d of catalog.documents) {
      if (DRY_RUN) continue;
      const id = assessmentId[d.code];
      const existing = await store.fetchAll('jsi_question', { select: ['jsi_text', 'jsi_order'], filter: `_jsi_assessment_value eq ${id}` });
      const same = existing.length === d.questions.length
        && d.questions.every((question, i) => existing.some((e) => e.jsi_order === i + 1 && e.jsi_text === question.text));
      if (same) continue;

      for (const old of existing) {
        const options = await store.fetchAll('jsi_answeroption', { filter: `_jsi_question_value eq ${old.jsi_questionid}` });
        for (const o of options) await store.remove('jsi_answeroption', o.jsi_answeroptionid);
        await store.remove('jsi_question', old.jsi_questionid);
      }
      for (const [i, question] of d.questions.entries()) {
        const questionId = await store.create('jsi_question', {
          jsi_text: question.text,
          jsi_explanation: question.explanation,
          jsi_order: i + 1,
          jsi_active: true,
        }, [{ attr: 'jsi_assessment', target: 'jsi_assessment', id }]);
        for (const [j, option] of question.options.entries()) {
          await store.create('jsi_answeroption', {
            jsi_text: option,
            jsi_order: j + 1,
            jsi_iscorrect: j === question.correct,
          }, [{ attr: 'jsi_question', target: 'jsi_question', id: questionId }]);
        }
      }
      replaced++;
      console.log(`   [preguntas cargadas] ${d.code} (${d.questions.length})`);
    }
    if (!DRY_RUN && replaced === 0) console.log('   Todas las preguntas ya estaban al día.');
  }

  // 7) Personas base y sus roles
  console.log('\n--- 7/7 Personas base y roles ---');
  for (const p of people) {
    if (!areaId[p.area]) throw new Error(`El área "${p.area}" de people.json no existe en catalog.json.`);
    const person = tally(await store.upsert('jsi_person', `jsi_email eq '${q(p.email)}'`, {
      jsi_fullname: `${p.firstName} ${p.lastName}`,
      jsi_firstname: p.firstName,
      jsi_lastname: p.lastName,
      jsi_email: p.email,
      jsi_jobtitle: p.jobTitle,
    }, [{ attr: 'jsi_area', target: 'jsi_area', id: areaId[p.area] }]), `${p.firstName} ${p.lastName} <${p.email}>`);

    for (const role of p.roles) {
      if (ROLE[role] === undefined) throw new Error(`El rol "${role}" no existe. Use: ${Object.keys(ROLE).join(', ')}.`);
      const filter = DRY_RUN ? `jsi_name eq 'dryrun-no-existe'` : `_jsi_person_value eq ${person.id} and jsi_role eq ${ROLE[role]}`;
      tally(await store.upsert('jsi_roleassignment', filter, {
        jsi_role: ROLE[role],
        jsi_isactive: true,
        jsi_jobtitle: p.jobTitle,
      }, [{ attr: 'jsi_person', target: 'jsi_person', id: person.id }]), `   rol ${role}`);
    }
  }

  // Resumen
  console.log('\n==================================================================');
  if (DRY_RUN) {
    console.log(` DRY-RUN finalizado. Se crearian ${stats.create} y se actualizarian ${stats.update} registros.`);
    console.log(' (las preguntas no se simulan). No se modifico Dataverse.');
  } else {
    console.log(` Listo. Creados: ${stats.create} · Actualizados: ${stats.update}`);
    const expected = {
      jsi_area: catalog.areas.length,
      ...(PEOPLE_ONLY
        ? {}
        : {
            jsi_stage: catalog.stages.length,
            jsi_document: catalog.documents.length,
            jsi_assessment: catalog.documents.length,
            jsi_question: catalog.documents.reduce((sum, d) => sum + d.questions.length, 0),
          }),
      jsi_person: people.length,
      jsi_roleassignment: people.reduce((sum, p) => sum + p.roles.length, 0),
    };
    console.log('\n Verificacion (registros que hay ahora en Dataverse):');
    for (const [table, value] of Object.entries(expected)) {
      const n = await store.count(table);
      console.log(`   ${table.padEnd(20)} ${String(n).padStart(4)} (esperado: ${value})${n === value ? '  OK' : '  <-- REVISAR'}`);
    }
  }
  console.log('==================================================================');
}

main().catch((e) => {
  console.error('\n[ERROR FATAL]', e.message);
  process.exit(1);
});
