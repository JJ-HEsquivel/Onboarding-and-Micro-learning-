# Onboarding and Micro-learning

Power Apps **Code App** (React + TypeScript + Vite) para la inducción y el micro aprendizaje de colaboradores.
Datos en **Dataverse**, automatizaciones en **Power Automate** y reportes en **Power BI**.

## Comandos

```powershell
npm install      # instalar dependencias
npm run dev      # servidor local (abrir el enlace de Power Apps que muestra la consola)
npm run build    # compilar a ./dist
npm run lint     # revisar el código
```

## Estructura

```
├── .power/                     # Esquemas de Dataverse generados por PAC CLI (no editar)
├── dataverse-schema-tool/      # Script Node que crea tablas, columnas y datos semilla en Dataverse
├── docs/                       # Modelo entidad-relación y documentación funcional
├── public/                     # Archivos estáticos (favicon)
└── src/
    ├── main.tsx                # Punto de entrada
    ├── app/                    # Arranque de la app: App.tsx y router.tsx
    ├── layouts/AppLayout/      # Barra lateral + barra superior comunes a todos los roles
    ├── modules/                # Un módulo por rol
    │   ├── index.ts            # Registro de roles
    │   ├── admin/
    │   │   ├── admin.module.ts # Menú lateral + rutas del Administrador
    │   │   └── pages/          # Una pantalla por opción del menú
    │   ├── manager/
    │   ├── collaborator/
    │   └── auth/               # Selector de rol (temporal, solo desarrollo)
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
