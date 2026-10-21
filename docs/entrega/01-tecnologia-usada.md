# 01 · Tecnología usada

| Campo | Valor |
| --- | --- |
| Sistema | Onboarding and Micro-learning |
| Versión | 0.4.0 |
| Entregable | JLS-ENG-PR01, actividad 7: «Tecnología usada» |
| Fuente | `package.json`, `package-lock.json`, `dataverse-schema-tool/package.json` |

## 1. Plataforma

| Componente | Producto | Uso en el sistema |
| --- | --- | --- |
| Hosting de la aplicación | Microsoft Power Apps — **Code Apps** | Publica y sirve la aplicación web; exige iniciar sesión con la cuenta de la organización |
| Identidad | Microsoft Entra ID | Autenticación de usuarios (con la MFA configurada en el tenant) |
| Base de datos | Microsoft Dataverse | 23 tablas propias (prefijo `jsi_`), seguridad por roles, auditoría |
| Automatización | Microsoft Power Automate | Avisos, recordatorios y procesos programados (fase 5, ver [02 · Arquitectura](02-arquitectura.md)) |
| Empaquetado y despliegue | Soluciones de Power Platform + Power Platform Pipelines | Mover el esquema y la app entre entornos |
| Repositorio | Git + GitHub | Código fuente, revisión por pull request, integración continua |

## 2. Aplicación (frontend)

| Librería | Versión | Licencia | Uso |
| --- | --- | --- | --- |
| React | 19.3.0 | MIT | Interfaz de usuario por componentes |
| React DOM | 19.3.0 | MIT | Renderizado en el navegador |
| React Router | 8.4.0 | MIT | Rutas por rol (`HashRouter`, compatible con el host de Power Apps) |
| lucide-react | 1.52.0 | ISC | Íconos |
| @microsoft/power-apps | 1.5.0 | Microsoft | SDK: acceso a Dataverse e identidad del usuario (`getContext`) |
| TypeScript | 5.9.3 | Apache-2.0 | Tipado estático (modo `strict`) |

## 3. Herramientas de desarrollo

| Herramienta | Versión | Uso |
| --- | --- | --- |
| Node.js | 22 LTS o superior (probado con 24.21) | Ejecutar herramientas y scripts |
| Vite | 7.3.7 | Servidor de desarrollo y build de producción |
| @microsoft/power-apps-vite | 1.0.13 | Plugin que conecta Vite con Power Apps («Local Play») |
| Vitest | 5.0.5 | Pruebas unitarias |
| ESLint + typescript-eslint | 9.39.5 | Estándares de codificación |
| Power Platform CLI (`pac`) | última estable | `pac code init`, `pac code add-data-source`, `pac code push` |

## 4. Herramienta de esquema (`dataverse-schema-tool`)

Scripts de Node.js que crean el esquema de Dataverse desde código (ver [ADR 0003](../adr/0003-esquema-como-codigo.md)).

| Librería | Uso |
| --- | --- |
| @azure/msal-node 2 | Inicio de sesión con código de dispositivo (sin secretos guardados) |
| dotenv | Leer la URL del entorno desde `.env` |
| Dataverse Web API v9.2 | Crear tablas, columnas, relaciones, claves, roles y auditoría |

## 5. Lenguajes y formatos

| Elemento | Formato |
| --- | --- |
| Código de la app | TypeScript (`.ts`, `.tsx`) |
| Estilos | CSS con variables (tokens) y nomenclatura BEM |
| Scripts | JavaScript ES Modules (`.mjs`) |
| Consultas a datos | OData v4 (a través del SDK) |
| Documentación | Markdown con diagramas Mermaid |
