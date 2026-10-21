# Onboarding and Micro-learning

Power Apps **Code App** (React + TypeScript + Vite) para la inducción y el micro aprendizaje de colaboradores.
Datos en **Dataverse**, automatizaciones en **Power Automate** (fase 5) y paneles con gráficas dentro de la app.

**Documentación de entrega** (JLS-ENG-PR01): [`docs/entrega`](docs/entrega/README.md) · Decisiones de arquitectura: [`docs/adr`](docs/adr) ·
Cómo trabajamos: [`CONTRIBUTING.md`](CONTRIBUTING.md) · Notas de versión: [`CHANGELOG.md`](CHANGELOG.md)

## Comandos

```powershell
npm ci           # instalar dependencias (versiones exactas del lock)
npm run dev      # servidor local (abrir el enlace de Power Apps que muestra la consola)
npm run lint     # estándares de codificación
npm test         # pruebas unitarias (Vitest)
npm run build    # compilar a ./dist
pac code push    # publicar en el entorno
```

La CI (`.github/workflows/ci.yml`) ejecuta lint, pruebas, build y `npm audit` en cada pull request.

## Estructura

```
├── .power/                     # Esquemas de Dataverse generados por PAC CLI (no editar)
├── dataverse-schema-tool/      # Script Node que crea tablas, columnas y datos semilla en Dataverse
├── docs/                       # Entrega (docs/entrega), decisiones (docs/adr), modelo entidad-relación
├── public/                     # Archivos estáticos (favicon)
└── src/
    ├── main.tsx                # Punto de entrada
    ├── app/                    # Arranque de la app: App.tsx, router.tsx y session/ (identidad y rol)
    ├── layouts/AppLayout/      # Barra lateral + barra superior comunes a todos los roles
    ├── modules/                # Un módulo por rol
    │   ├── index.ts            # Registro de roles
    │   ├── admin/
    │   │   ├── admin.module.ts # Menú lateral + rutas del Administrador
    │   │   └── pages/          # Una pantalla por opción del menú
    │   ├── manager/
    │   ├── collaborator/
    │   ├── common/             # Pantallas compartidas entre roles (ficha del colaborador, lector)
    │   └── auth/               # Inicio: elegir con qué perfil entrar
    ├── services/               # Acceso a datos: usa src/generated y devuelve modelos de dominio
    ├── shared/                 # Código reutilizable entre roles
    │   ├── components/         # Button, Modal, Badge, StatCard, PageHeader…
    │   ├── constants/          # Valores de los Choice de Dataverse, etiquetas de estado
    │   ├── hooks/              # useAsync (carga de datos con estado de carga/error)
    │   ├── lib/                # Funciones utilitarias (formato de fechas, CSV)
    │   ├── styles/             # global.css (variables y base) y components.css
    │   └── types/              # Tipos compartidos y modelos de dominio
    └── generated/              # Modelos y servicios de Dataverse generados por PAC CLI (no editar)
```

## Capas

```
Pantalla (modules/.../pages)  →  services/*.service.ts  →  generated/services  →  Dataverse
```

- Las pantallas **no** usan `src/generated` directamente: llaman a `src/services`.
- `src/services` traduce las columnas de Dataverse (`jsi_...`, `_jsi_area_value`) a modelos simples
  (`Collaborator`, `Area`…) definidos en `src/shared/types/onboarding.ts`.
- Los números de las columnas Choice están en `src/shared/constants/choices.ts`; nunca se escriben sueltos.

## Pantallas con varias partes

Una pantalla simple es un archivo (`pages/AdminDocumentsPage.tsx`). Cuando crece, pasa a ser una carpeta:

```
pages/collaborators/
├── AdminCollaboratorsPage.tsx   # Compone la pantalla y maneja su estado
├── AdminCollaboratorsPage.css
├── collaboratorFilters.ts       # Lógica sin interfaz (filtros, exportación)
└── components/                  # Partes de la pantalla (tabla, filtros, modal…)
```

## Cómo agregar una pantalla nueva

1. Crear el componente en `src/modules/<rol>/pages/MiPantallaPage.tsx`.
2. Agregarlo al menú en `src/modules/<rol>/<rol>.module.ts` (`path`, `label`, `icon`, `page`).

La ruta y la opción de la barra lateral se crean automáticamente a partir de esa configuración.

## Convenciones

- Las importaciones usan el alias `@/` → `src/` (ej. `import { Avatar } from '@/shared/components/Avatar'`).
- `src/generated/` y `.power/` los regenera `pac code add-data-source`; no se modifican a mano
  ni se mueven (los servicios importan `.power/` con rutas relativas).
- Íconos: [lucide-react](https://lucide.dev/icons).

## Identidad y sesión

- **Producción** (`npm run build` → `pac code push`): la persona es la cuenta de Microsoft Entra ID
  con la que se abrió Power Apps. Se busca por correo y solo entra con sus roles de
  `jsi_roleassignment` ([ADR 0005](docs/adr/0005-identidad-real-y-simulacion.md)).
- **Desarrollo** (`npm run dev`): selector simulado de rol y persona, con aviso visible. Se desactiva
  con `VITE_ROLE_SIMULATION=false` en `.env.local`.

Cualquier pantalla obtiene a la persona con `useCurrentUser()` (`src/app/session`).

## Flujo de inducción implementado

1. **Admin → Colaboradores → Registrar colaborador:** crea la persona, su rol Colaborador, su
   inducción (pendiente de validación, con el Admin como `jsi_registeredby`) y la ruta propuesta.
2. **Manager → Nuevos por validar:** ve a quienes debe validar, tilda o destilda documentos de
   cualquier etapa y confirma. Se calculan los vencimientos y la inducción pasa a "Validated".
3. **Colaborador → Mis documentos:** ve su ruta solo si ya fue validada y confirma cada lectura
   (se guarda una evidencia en `jsi_evidence`).

## Gestión del equipo (fase 3)

- **Ficha del colaborador** (`modules/common`): Admin y Manager la abren desde cualquier tabla.
  Muestra ruta por etapas, historial y motivos de atención; permite recordar, habilitar un nuevo
  intento a quien agotó los 3, asignar documentos (Manager), ascender y dar de baja (Admin).
- **Manager:** Panel del equipo, Mi equipo, Asignar documentos (solo Etapa 3 de su área),
  Documentos (solo lectura), Resultados e Historial de inducción (si llegó por ascenso).
- **Admin:** Panel general con indicadores, estado por área y colaboradores que requieren atención.
- "Requiere atención" se calcula en `shared/domain/attention.ts`: validación pendiente, lecturas
  vencidas, exámenes reprobados o agotados y días sin actividad (`PROGRAM_RULES.inactivityDays`).
- Las pantallas se cargan bajo demanda (`React.lazy`): cada una se descarga al abrirla.

## Gestión de contenido (fase 4)

Tres pantallas del Admin, con sus estilos y piezas comunes en `modules/admin/content`:

- **Documentos** (`documentCatalog.service.ts`, `documentVersion.service.ts`): alta y edición
  (código único, etapa, categoría, criticidad, contenido con vista previa, áreas destinatarias,
  borrador). **Nueva versión**: queda en `jsi_documentversion`, el documento pasa a "Actualizado"
  y se avisa a quienes lo tienen asignado. Si el cambio es **mayor**, quien sigue en inducción y
  ya lo leyó debe releerlo y su examen se reinicia (las inducciones completadas no se reabren).
  Reglas de numeración en `shared/domain/documentVersion.ts`.
- **Rutas de aprendizaje** (`stages.service.ts`): alta y edición de etapas (orden, plazo, alcance
  General o Por área con sus áreas en `jsi_stagearea`) y la ruta propuesta a cada área, donde se
  marca qué documentos de la etapa por área se proponen por defecto (`jsi_isdefault`).
- **Evaluaciones** (`assessmentEditor.service.ts`): nota mínima, intentos, duración y preguntas
  con sus opciones, más intentos rendidos y tasa de aprobación. Una pregunta ya respondida nunca
  se modifica ni se borra: se archiva (`jsi_active = false`) y se crea otra, para que el historial
  de respuestas siga siendo exacto (`shared/domain/assessmentChanges.ts`).
- No se eliminan etapas ni documentos: las relaciones de Dataverse son "Restrict". Un documento se
  retira de las rutas nuevas pasándolo a borrador.
