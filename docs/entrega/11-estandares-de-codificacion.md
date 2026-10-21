# 11 · Estándares de codificación

| Campo | Valor |
| --- | --- |
| Sistema | Onboarding and Micro-learning |
| Versión | 0.4.0 |
| Entregable | JLS-ENG-PR01, actividad 2: «aplicar estándares de codificación y buenas prácticas» |
| Verificación automática | ESLint + TypeScript `strict` en cada pull request (CI) |

## 1. Idioma

| Elemento | Idioma | Ejemplo |
| --- | --- | --- |
| Identificadores (variables, funciones, tipos, archivos, tablas) | Inglés | `computeProgress`, `jsi_documentassignment` |
| Textos que ve el usuario | Español | «Registrar colaborador» |
| Comentarios y documentación | Español | `// Las etapas generales siempre van completas.` |

## 2. Nomenclatura en TypeScript y React

| Elemento | Convención | Ejemplo |
| --- | --- | --- |
| Componente de React | PascalCase | `DocumentFormModal`, `StageGroup` |
| Pantalla (página) | `<Rol><Nombre>Page`, PascalCase | `AdminDocumentsPage`, `ManagerTeamPage` |
| Hook | camelCase con prefijo `use` | `useAsync`, `useSession`, `useMyInduction` |
| Función y variable | camelCase, verbo al inicio en funciones | `loadIdentity`, `publishVersion`, `isCodeTaken` |
| Función que devuelve booleano | prefijo `is`, `has`, `can` | `isValidVersion`, `isExamExhausted` |
| Tipo e interfaz | PascalCase, sin prefijo `I` | `ManagedDocument`, `StageInput` |
| Props de un componente | `<Componente>Props` | `DocumentFormModalProps` |
| Constante de módulo | UPPER_SNAKE_CASE | `PROGRAM_RULES`, `ACTIVE_RECORDS`, `FORM_ID` |
| Valores de un Choice | UPPER_SNAKE_CASE con claves PascalCase | `DOCUMENT_STATUS.Draft` |
| Unión de textos | camelCase | `'pendingValidation' \| 'inProgress'` |
| Booleanos de estado de React | `[valor, setValor]` | `const [saving, setSaving] = useState(false)` |

## 3. Nomenclatura de archivos y carpetas

| Elemento | Convención | Ejemplo |
| --- | --- | --- |
| Componente | `PascalCase.tsx` | `AreaChecklist.tsx` |
| Estilos de un componente o pantalla | mismo nombre `.css` | `AdminManagersPage.css` |
| Servicio | `camelCase.service.ts` | `documentVersion.service.ts` |
| Módulo de rol | `<rol>.module.ts` | `admin.module.ts` |
| Reglas de dominio | `camelCase.ts` en `shared/domain` | `assessmentChanges.ts` |
| Prueba unitaria | junto al archivo, `*.test.ts` | `assessmentChanges.test.ts` |
| Carpeta de pantalla | kebab-case | `learning-paths/`, `pending-validation/` |
| Script de Node | kebab-case `.mjs` | `create-security-roles.mjs` |
| Documento | kebab-case `.md`, numerado si es parte de un paquete | `03-despliegue.md` |
| Decisión de arquitectura | `NNNN-titulo.md` en `docs/adr` | `0002-tabla-propia-jsi-person.md` |

## 4. CSS

| Regla | Convención | Ejemplo |
| --- | --- | --- |
| Nombres de clase | **BEM**: `bloque__elemento--modificador` | `.question-card__option`, `.role-select__item--open` |
| Colores, radios, medidas comunes | Variables CSS (tokens) en `global.css` | `var(--color-primary)`, `var(--radius-card)` |
| Estilos compartidos | `shared/styles/components.css` | `.btn`, `.badge`, `.modal` |
| Prohibido | `!important`, colores sueltos repetidos, estilos en línea para el diseño | — |

## 5. Dataverse

| Elemento | Convención | Ejemplo |
| --- | --- | --- |
| Prefijo de publisher | `jsi` en todo | `jsi_document` |
| Nombre de esquema (SchemaName) | `jsi_` + PascalCase en inglés | `jsi_DocumentVersion`, `jsi_ReadingMinutes` |
| Nombre lógico | minúsculas (lo genera Dataverse) | `jsi_documentversion` |
| Lookup leído en la app | `_<columna>_value` | `_jsi_stage_value` |
| Relación 1:N | `jsi_<padre>_<hijo>[_<rol>]` | `jsi_person_onboarding_validator` |
| Clave alternativa | `jsi_<tabla>_<columna>_key` | `jsi_person_email_key` |
| Columna principal autonumérica | prefijo de 4 letras | `ONB-{SEQNUM:5}`, `EVID-{SEQNUM:6}` |
| Choice local | valores desde 100000000 | `100000000 = Current` |
| Tabla intermedia N:N | `jsi_<a><b>` | `jsi_stagearea`, `jsi_documentarea` |
| Rol de seguridad | `Onboarding - <Rol>` | `Onboarding - Manager` |

## 6. Reglas de código

| Regla | Por qué |
| --- | --- |
| TypeScript `strict`, sin variables ni parámetros sin usar | Errores detectados al compilar |
| Las pantallas no llaman a los servicios generados; solo a `src/services` | Una sola capa conoce Dataverse |
| Nunca editar `src/generated` | Lo regenera `pac code add-data-source` |
| Texto en filtros con `odataString()`, ids con `odataId()` | Consultas seguras (OWASP) |
| Toda operación de Dataverse pasa por `unwrap()` o `fetchAll()` | Errores legibles y paginación completa |
| Reglas de negocio como funciones puras en `shared/domain`, con prueba | Se pueden probar sin Dataverse |
| Sin `dangerouslySetInnerHTML`, `eval` ni `console.log` con datos personales | Seguridad y privacidad |
| Hooks de React con dependencias completas (regla `react-hooks/exhaustive-deps`) | Evita datos desactualizados |
| Comentarios que explican el **porqué**, no el qué | El código ya dice el qué |

## 7. Git

| Elemento | Convención | Ejemplo |
| --- | --- | --- |
| Rama de funcionalidad | `feature/<tema-en-kebab-case>` | `feature/person-table` |
| Rama de corrección | `fix/<tema>` | `fix/exam-retry` |
| Mensaje de commit | **Conventional Commits**: `tipo(ámbito): descripción` en imperativo | `feat(documents): publicar versiones mayores y menores` |
| Tipos de commit | `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `security` | `security(auth): usar la cuenta real en producción` |
| Versión | SemVer `MAYOR.MENOR.PARCHE` | `0.4.0` |
| Integración | Pull request a `main` con revisión y CI en verde | — |
