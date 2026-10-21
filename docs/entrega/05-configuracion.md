# 05 · Configuración

| Campo | Valor |
| --- | --- |
| Sistema | Onboarding and Micro-learning |
| Versión | 0.4.0 |
| Entregable | JLS-ENG-PR01, actividad 5: «configuraciones» |

Ningún archivo de configuración contiene contraseñas, tokens ni claves. Los archivos `.env` están excluidos del repositorio (`.gitignore`).

## 1. Aplicación

| Archivo | Clave | Valor actual | Para qué |
| --- | --- | --- | --- |
| `power.config.json` | `appId`, `environmentId` | Lo genera `pac code init` | Identifica la app y su entorno; cambia por entorno |
| `power.config.json` | `databaseReferences` | Tablas conectadas | Lo mantiene `pac code add-data-source`; no editar a mano |
| `src/shared/constants/program.ts` | `passingScore` | 80 | Nota mínima por defecto de un examen (%) |
| | `maxAttempts` | 3 | Intentos por examen |
| | `examDueDays` | 3 | Días para rendir el examen desde que se confirma la lectura |
| | `inactivityDays` | 3 | Días sin actividad para aparecer en «Requiere atención» |
| | `extraDocumentDueDays` | 5 | Plazo de un documento que el Manager suma, o que se debe releer por versión mayor |
| | `requireCompletedOnboardingForPromotion` | true | Solo asciende quien completó su inducción |
| `.env.local` (opcional, no se sube) | `VITE_ROLE_SIMULATION` | sin definir | `false` desactiva la simulación también en `npm run dev`. En el build de producción la simulación no existe |

La nota mínima, los intentos y la duración se pueden ajustar por evaluación desde la pantalla **Evaluaciones**; `program.ts` define los valores de las evaluaciones nuevas.

## 2. Herramienta de esquema (`dataverse-schema-tool`)

| Archivo | Clave | Valor actual | Para qué |
| --- | --- | --- | --- |
| `.env` | `DATAVERSE_URL` | URL del entorno | A qué entorno se conectan los scripts |
| `.env` | `AUTH_MODE` | `device` | Inicio de sesión con código de dispositivo (`azcli` como alternativa) |
| `schema.mjs` | `CONFIG.publisherPrefix` | `jsi` | Prefijo de todas las tablas y columnas. **No se cambia** una vez creado |
| | `CONFIG.solutionUniqueName` | `OnboardingMicroLearning` | Solución que agrupa todo |
| | `CONFIG.solutionVersion` | `1.0.0.0` | Se sube en cada pase a pruebas o producción |
| | `CONFIG.auditRetentionDays` | 90 | Días que se conserva la auditoría (la política exige 30 como mínimo) |
| `security-roles.mjs` | `SECURITY_ROLES` | 3 roles | Matriz de permisos de cada rol |
| `data/catalog.json` | — | 6 áreas, 8 etapas, 38 documentos | Catálogo de ejemplo del programa |
| `data/people.json` | — | 2 administradores, 3 managers | Personas base de los entornos de desarrollo y pruebas |

## 3. Valores que cambian por entorno

| Valor | Desarrollo | Pruebas | Producción |
| --- | --- | --- | --- |
| URL de Dataverse | la del entorno de desarrollo | la de QA | la de producción |
| Simulación de roles | activa con `npm run dev` | no existe (build) | no existe (build) |
| Datos base | `npm run seed` | `npm run seed` o copia despersonalizada autorizada | Datos reales cargados por el Administrador |
| Auditoría | recomendada | obligatoria | obligatoria, 90 días |
| Flujos (fase 5) | conexiones del desarrollador | cuenta de servicio | cuenta de servicio |
