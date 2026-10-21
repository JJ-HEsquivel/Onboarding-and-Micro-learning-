# 08 · Seguridad y resumen de riesgos

| Campo | Valor |
| --- | --- |
| Sistema | Onboarding and Micro-learning |
| Versión | 0.4.0 |
| Entregables | JLS-ENG-PR01, actividad 7 «Resumen de los puntos de riesgo del producto»; políticas JLS-EIS-PO33 y JLS-EIS-PO12 |
| Clasificación de la información | Confidencial interna: contiene datos personales (nombre, correo, cargo, área) y resultados de evaluaciones |

## 1. Controles de Desarrollo Seguro (JLS-EIS-PO33)

| Lineamiento | Control implementado | Evidencia |
| --- | --- | --- |
| Datos obligatorios y opcionales | Nivel requerido por columna; formularios que marcan el campo faltante | `schema.mjs`, `validate()` de cada formulario |
| Validación de números, textos, fechas y formatos | Correo, código `POL-TI-001`, enteros > 0, rangos (nota 1–100, intentos 1–10), longitud máxima por columna | `RegisterCollaboratorModal`, `DocumentFormModal`, `StageFormModal`, `AssessmentEditorModal` |
| Integridad | Claves alternativas (correo, código de documento); relaciones `Restrict`; evidencia y preguntas respondidas inmutables | `schema.mjs`, [ADR 0004](../adr/0004-evidencia-inmutable.md) |
| Cifrado en reposo y en tránsito | Cifrado de Dataverse administrado por Microsoft; HTTPS (TLS) en todo el tráfico | Plataforma |
| Validación de la salida / escape | React escapa todo texto; 0 usos de `dangerouslySetInnerHTML` | Revisión de código |
| Consultas seguras | SDK de Microsoft; textos con `odataString()`, ids validados con `odataId()` | `src/services/dataverse.ts`, `dataverse.test.ts` |
| Autenticación robusta | Microsoft Entra ID con la MFA del tenant; la app usa la cuenta real | `identity.service.ts`, [ADR 0005](../adr/0005-identidad-real-y-simulacion.md) |
| Roles y permisos | Roles de la app con historial (`jsi_roleassignment`) + roles de seguridad de Dataverse (sección 3) | `SessionProvider.tsx`, `security-roles.mjs` |
| Datos sensibles y secretos | Sin credenciales en el código; inicio de sesión por código de dispositivo; `.env` excluido | `.gitignore`, `lib/dataverse-client.mjs` |
| Librerías confiables | Dependencias de Microsoft y del ecosistema React; `npm audit` en la CI | [10 · Informe de vulnerabilidades](10-informe-de-vulnerabilidades.md) |
| Revisión preventiva del código | Pull request con revisión de un compañero, checklist de seguridad y CI | `.github/pull_request_template.md`, `.github/workflows/ci.yml` |

## 2. Controles de Adquisición, Desarrollo y Mantenimiento (JLS-EIS-PO12)

| Lineamiento | Control implementado |
| --- | --- |
| Requisitos de seguridad desde el diseño | Este documento y el checklist de cada pull request |
| Tecnologías confiables | Plataforma Microsoft Power Platform |
| Servicios en redes públicas | HTTPS (TLS) + Entra ID |
| Transacciones entre aplicaciones | Flujos con el conector de Dataverse (TLS); los datos personales no salen de Microsoft 365 |
| Control de cambios | [CONTRIBUTING](../../CONTRIBUTING.md): pedido, aprobación, componentes afectados, documentación, versión |
| Software de terceros | `src/generated` no se edita; se regenera con `pac` |
| Datos de prueba | Solo datos ficticios; copias de producción solo despersonalizadas y con autorización |
| Logs de 30 días o más | Auditoría de Dataverse con 90 días + `jsi_evidence` |

## 3. Matriz de roles de seguridad de Dataverse

Definida en `dataverse-schema-tool/security-roles.mjs` y aplicada con `npm run roles`. Alcance: organización. C crear · R leer · W modificar · D borrar · A asignar lookup · T recibir lookup.

| Tabla | Administrador | Manager | Colaborador |
| --- | --- | --- | --- |
| Catálogo (áreas, etapas, documentos, evaluaciones, preguntas, campañas) | CRWDAT | RT | RT |
| `jsi_person` | CRWDAT | RT | RT |
| `jsi_roleassignment` | CRWDAT | R | R |
| `jsi_onboarding` | CRWDAT | RWAT | RW |
| `jsi_documentassignment` | CRWDAT | CRWDAT | RWT |
| `jsi_assessmentassignment` | CRWDAT | CRWDAT | RWT |
| `jsi_assessmentattempt` | RT | R | CRAT |
| `jsi_questionresponse` | R | R | CRA |
| `jsi_notification` | CRWDAT | CRA | RW |
| `jsi_evidence` | CRA | CRA | CRA |

Nadie puede modificar ni borrar una evidencia. Cada usuario necesita además el rol estándar **Basic User**.

## 4. Registro de riesgos

Probabilidad e impacto: Alta / Media / Baja.

| ID | Riesgo | Prob. | Impacto | Mitigación | Estado |
| --- | --- | --- | --- | --- | --- |
| R-01 | El navegador recibe las respuestas correctas del examen para corregirlo; alguien con herramientas de desarrollador podría verlas | Media | Alto | Corregir en el servidor (flujo de Power Automate o Custom API) y no enviar las respuestas al navegador | Abierto · fase 5 |
| R-02 | Alcance de los roles de seguridad a nivel organización: un Colaborador podría leer la inducción de otro si usa otra herramienta | Media | Medio | Vincular cada persona a su cuenta (`jsi_user`), asignarle sus registros y bajar el alcance del Colaborador a «Usuario» | Abierto |
| R-03 | La auditoría registra recién desde que se activa en el entorno | Alta | Medio | Ejecutar `npm run audit:org` en cada entorno en su primer despliegue | Mitigado al ejecutar |
| R-04 | Las columnas obligatorias se exigen en la app, no en la API de Dataverse | Baja | Bajo | Reglas de negocio de Dataverse o validación en flujos | Abierto |
| R-05 | El estado «atrasado» se recalcula solo cuando alguien actúa | Alta | Bajo | Flujo diario de recálculo (fase 5) | Abierto · fase 5 |
| R-06 | Dependencia `@azure/msal-node` 2 de la herramienta local con un aviso moderado en `uuid` | Baja | Bajo | No se publica con la app; actualizar a la versión 7 en un cambio aparte | Aceptado |
| R-07 | Un borrado de columna en producción no tiene rollback automático | Baja | Alto | Desplegar los borrados en dos pases (ver [03 · Despliegue](03-despliegue.md)) | Mitigado por procedimiento |
| R-08 | Una persona sin `jsi_person` con su correo no puede entrar | Media | Bajo | Mensaje claro en la app; registro por el Administrador | Mitigado |
