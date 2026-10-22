# 07 · APIs y monitoreo

| Campo | Valor |
| --- | --- |
| Sistema | Onboarding and Micro-learning |
| Versión | 0.4.0 |
| Entregables | JLS-ENG-PR01, actividad 5 «endpoints» y actividad 7 «Información de API expuestos para monitoring» |

## 1. APIs expuestas

**El sistema no expone APIs propias.** No tiene servidor ni endpoints públicos: la app corre dentro de Power Apps y accede solo a la **Web API de Dataverse** del mismo entorno, a través del SDK de Microsoft y con la identidad del usuario. Microsoft opera y monitorea esa API.

## 2. Datos que consume la app (Dataverse Web API, OData v4)

Cada servicio de `src/services` es el único punto que usa sus tablas. Operaciones: L = leer, C = crear, A = actualizar, B = borrar.

| Servicio | Tablas (entity set) | Operaciones |
| --- | --- | --- |
| `identity` | `jsi_persons`, `jsi_roleassignments` (vía `people`) | L |
| `people` | `jsi_persons`, `jsi_roleassignments` | L |
| `areas` | `jsi_areas` | L |
| `collaborators` | `jsi_persons`, `jsi_roleassignments`, `jsi_onboardings`, `jsi_documentassignments` | L, C, B (deshacer un registro fallido) |
| `validation` | `jsi_onboardings`, `jsi_documentassignments`, `jsi_assessmentassignments`, `jsi_notifications` | L, C, A, B |
| `myInduction` | `jsi_onboardings`, `jsi_documentassignments`, `jsi_assessmentassignments` | L, A |
| `route` | `jsi_onboardings`, `jsi_documentassignments`, `jsi_assessmentassignments`, `jsi_assessments` | L, A |
| `exam` | `jsi_assessments`, `jsi_questions`, `jsi_answeroptions`, `jsi_assessmentassignments`, `jsi_assessmentattempts`, `jsi_questionresponses` | L, C, A |
| `documents` | `jsi_documents` | L |
| `documentCatalog` | `jsi_documents`, `jsi_documentareas`, `jsi_documentcategories`, `jsi_assessments`, `jsi_questions` | L, C, A, B (solo filas de áreas) |
| `documentVersion` | `jsi_documentversions`, `jsi_documents`, `jsi_documentassignments`, `jsi_assessmentassignments`, `jsi_onboardings`, `jsi_notifications` | L, C, A |
| `stages` | `jsi_stages`, `jsi_stageareas` | L, C, A, B (solo filas de áreas) |
| `onboardingRoute` | `jsi_stages`, `jsi_stageareas`, `jsi_documents`, `jsi_documentareas`, `jsi_assessments` | L |
| `assessmentEditor` | `jsi_assessments`, `jsi_questions`, `jsi_answeroptions`, `jsi_questionresponses`, `jsi_assessmentassignments`, `jsi_assessmentattempts` | L, C, A, B (solo preguntas sin respuestas) |
| `team` | `jsi_documentassignments`, `jsi_assessmentassignments`, `jsi_assessmentattempts`, `jsi_roleassignments`, `jsi_notifications` | L, C |
| `promotion` | `jsi_persons`, `jsi_roleassignments`, `jsi_onboardings` | L, C, A |
| `profile` | `jsi_persons`, `jsi_roleassignments`, `jsi_onboardings`, `jsi_assessmentassignments` | L, A |
| `evidence` | `jsi_evidences` | L, C (nunca A ni B) |
| `notification` | `jsi_notifications` | C |


## 3. Monitoreo

| Qué se monitorea | Herramienta | Dónde se ve | Retención |
| --- | --- | --- | --- |
| Cambios en los datos (quién, qué, cuándo, valor anterior y nuevo) | Auditoría de Dataverse | make.powerapps.com > registro > Historial de auditoría; Centro de administración > Auditoría | 90 días |
| Accesos de usuarios al entorno | Auditoría de acceso de Dataverse | Centro de administración > Auditoría | 90 días |
| Acciones de negocio (lecturas, exámenes, cambios de rol) | Tabla `jsi_evidence` | Ficha del colaborador en la app | Indefinida |
| Uso de la app (sesiones, usuarios activos) | Analítica de Power Apps | Centro de administración > Analítica > Power Apps | Según la plataforma |
| Rendimiento y errores de Dataverse | Analítica de Dataverse | Centro de administración > Analítica > Dataverse | Según la plataforma |
| Ejecuciones de flujos (fase 5) | Historial de Power Automate + registro en Dataverse | Power Automate > Mis flujos; tabla de registro | 28 días en Power Automate; 90 días en Dataverse |

Recomendación para producción: conectar el entorno con **Azure Application Insights** (exportación de telemetría de Dataverse y Power Apps) para alertas centralizadas. Requiere una suscripción de Azure de la organización.
