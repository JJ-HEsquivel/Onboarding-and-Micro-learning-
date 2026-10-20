# Onboarding and Micro-learning — Dataverse Schema Tool

Crea automaticamente, desde Node.js, las tablas, columnas y relaciones del
sistema de Onboarding and Micro-learning en tu entorno de Dataverse. No se
crea nada manualmente desde la interfaz web.

- Todos los nombres tecnicos (tablas, columnas, relaciones) quedan **en
  ingles**, con el prefijo `jsi_`.
- El script **no guarda ni imprime contrasenas, tokens ni secretos**.
- Es **idempotente**: si corres el script dos veces, la segunda vez detecta
  lo que ya existe y solo crea lo que falta.
- Tiene **modo dry-run**: te muestra que haria, sin tocar Dataverse.

---

## 0. Requisitos previos

- Windows 10/11 con [Node.js 18 o superior](https://nodejs.org) instalado.
- [Visual Studio Code](https://code.visualstudio.com/).
- Acceso a tu entorno de Dataverse (la misma URL que usaste con
  `pac auth create --environment "https://orga14c5fc4.crm2.dynamics.com"`).
- Permiso para crear una **App Registration** en tu Azure AD / Entra ID
  universitaria (confirmaste que sí puedes).

Verifica tu version de Node abriendo una terminal (`Ctrl+ñ` en VS Code) y
corriendo:
```powershell
node -v
```

---

## 1. Autenticacion (NO necesitas App Registration)

El script usa *Device Code Flow* con el client ID publico que Microsoft publica
para ejecutar scripts contra Dataverse. No necesitas acceso al portal de Azure
ni crear ningun secreto.

**Modo por defecto (`AUTH_MODE=device`)**: al ejecutar, te muestra una URL y un
codigo; los abres en el navegador e inicias sesion con tu cuenta universitaria.

**Plan B (`AUTH_MODE=azcli`)**: si tu tenant bloquea el modo anterior, instala
[Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli), corre
`az login` y pon `AUTH_MODE=azcli` en tu `.env`.

---

## 2. Configurar el proyecto

1. Copia esta carpeta a `Onboarding-and-Micro-learning\dataverse-schema-tool`.
2. Abre una terminal dentro de esa carpeta.
3. `copy .env.example .env` y verifica que `DATAVERSE_URL` sea tu entorno.

---

## 3. Instalar dependencias

En la terminal, dentro de la carpeta del proyecto:
```powershell
npm install
```
Esto instala solo 2 paquetes: `@azure/msal-node` (autenticacion) y `dotenv`
(leer el archivo `.env`). No se sube `node_modules` a ningun lado.

---

## 4. Probar primero en modo dry-run (recomendado)

```powershell
npm run dry-run
```
Va a pedirte iniciar sesion: te muestra un codigo de 8 digitos y una URL
(`https://microsoft.com/devicelogin`). Abre esa URL en tu navegador, pega el
codigo, inicia sesion con tu cuenta universitaria.

Despues del login, el script **solo lee** tu Dataverse (ninguna escritura) e
imprime algo como:
```
[table] Area (jsi_area) NO existe -> se crearia
[table] Stage (jsi_stage) NO existe -> se crearia
   [col] jsi_Document.jsi_Code (String) NO existe -> se crearia
   [lookup] jsi_Document.jsi_Stage -> jsi_Stage NO existe -> se crearia
...
DRY-RUN finalizado. No se modifico Dataverse.
```
Revisa con calma esta salida antes de seguir.

---

## 5. Ejecutar de verdad

```powershell
npm run create
```
Mismo login. Esta vez el script si crea publisher, solution, las 23 tablas
personalizadas (incluida la persona, `jsi_person`), sus columnas, las
relaciones y las claves alternativas (ej. el correo unico de cada persona).
Al final publica los cambios
(`PublishAllXml`) para que se vean de inmediato en `make.powerapps.com`.

**Puedes correrlo varias veces sin miedo**: lo que ya existe se detecta y se
salta; solo crea lo que falta.

---

## 6. Verificar el resultado

1. Ve a [make.powerapps.com](https://make.powerapps.com) → selecciona tu
   entorno → **Tables**.
2. Busca la solución **"Onboarding and Micro-learning"** en **Solutions**
   para ver todo agrupado.
3. Revisa 2 o 3 tablas (por ejemplo `jsi_Document` y `jsi_DocumentArea`) y
   confirma que las columnas y relaciones coinciden con lo esperado.

**No asumas que quedo bien hasta que lo veas tu mismo en el portal.**

---

## 7. Incorporar las tablas a tu Power Apps Code App

Una vez verificadas las tablas, desde la carpeta de tu Code App (la que
creaste con `pac code init`), corre `pac code add-data-source` **una vez por
cada tabla** que tu app vaya a usar. Ejemplo para las 4 tablas principales:

```powershell
pac code add-data-source -a dataverse -t jsi_area
pac code add-data-source -a dataverse -t jsi_stage
pac code add-data-source -a dataverse -t jsi_document
pac code add-data-source -a dataverse -t jsi_documentassignment
pac code add-data-source -a dataverse -t jsi_person
```
(repite para cada tabla adicional que necesites: `jsi_assessment`,
`jsi_assessmentassignment`, `jsi_campaign`, etc.)

Esto genera automaticamente, dentro de tu proyecto Vite:
- Modelos TypeScript (`src/generated/models/...`) con las columnas exactas.
- Servicios (`src/generated/services/...`) con metodos `getAll`, `getById`,
  `create`, `update`, `delete` ya conectados a tu entorno, usando la misma
  sesion que autenticaste con `pac auth create`.

Despues de agregar las fuentes de datos, sigue tu flujo normal:
```powershell
npm run dev        # prueba local
npm run build       # compila para produccion
dir dist            # confirma que se genero la carpeta
pac code push        # publica la Code App
```

---

## 8. Que hacer si algo falla

- **401 / Unauthorized**: revisa que `AZURE_TENANT_ID` y `AZURE_CLIENT_ID`
  sean correctos y que el permiso `user_impersonation` sobre "Dynamics CRM"
  este agregado (paso 1.5).
- **403 / Insufficient privileges**: tu usuario no tiene el rol de seguridad
  necesario (necesitas System Customizer o System Administrator en ese
  entorno de Dataverse). Pidele a tu admin de Power Platform ese rol.
- **Error creando el publisher** (`customizationoptionvalueprefix` ocupado):
  cambia `publisherOptionValuePrefix` en `schema.mjs` por otro numero entre
  10000 y 99999 y vuelve a correr.
- El script se puede interrumpir con `Ctrl + C` en cualquier momento; al
  volver a correrlo retoma desde donde detecte que falta algo.

---

## 9. Estructura de archivos

```
onboarding-dataverse-schema-tool/
├── schema.mjs          <- Definicion de tablas/columnas/relaciones (editable)
├── create-tables.mjs    <- Motor que lee schema.mjs y llama a la Web API
├── remove-columns.mjs   <- Borra relaciones y columnas obsoletas
├── reset-data.mjs / seed-data.mjs   <- Reinicio y carga de datos base
├── migrate-contact-to-person.mjs    <- Migracion de una sola vez (seccion 13)
├── data/                <- catalog.json y people.json
├── lib/                 <- Cliente de la Web API y operaciones sobre registros
├── package.json
├── .env.example         <- Plantilla (sin datos reales)
├── .env                 <- TU creas este archivo, con tus valores (no se sube a git)
├── .gitignore
└── README.md            <- Este archivo
```

Si necesitas agregar una tabla o columna nueva más adelante, edítala en
`schema.mjs` (siguiendo el mismo patrón) y vuelve a correr
`npm run create` — el script solo creará lo nuevo.

---

## 10. Scripts disponibles

| Comando | Qué hace |
|---|---|
| `npm run dry-run` / `npm run create` | Crea tablas, columnas y relaciones que falten (nunca borra) |
| `npm run remove-columns:dry-run` / `npm run remove-columns` | Borra las relaciones de `REMOVED_RELATIONSHIPS` y las columnas de `REMOVED_COLUMNS` (schema.mjs) |
| `npm run reset:dry-run` / `npm run reset` | Borra los datos de inducción y el catálogo, conservando áreas y personas base (pide escribir REINICIAR) |
| `npm run seed:dry-run` / `npm run seed` | Carga el catálogo de `data/catalog.json` y las personas de `data/people.json` |
| `npm run seed:people:dry-run` / `npm run seed:people` | Solo áreas, personas base y sus roles (no toca el catálogo) |
| `npm run migrate:person:dry-run` / `npm run migrate:person` | Migración de una sola vez de `contact` a `jsi_person` (sección 13; pide escribir MIGRAR) |

Archivos:
- `lib/dataverse-client.mjs`: inicio de sesión y llamadas a la Web API, compartido por los scripts.
- `remove-columns.mjs`: borra columnas obsoletas. **Borrar una columna borra sus datos.**

## 11. Cambio de modelo: personas, roles e inducciones

La persona (hoy `jsi_person`; en esta versión era `contact`) existe una sola vez. Sus roles están en `jsi_roleassignment`
(puede tener varios) y cada inducción en `jsi_onboarding`. Por eso se quitaron de
`contact` las columnas `jsi_onboardingstatus`, `jsi_progressstatus`, `jsi_risklevel`
y `jsi_userrole`.

Orden para aplicarlo (siempre primero el dry-run de cada paso):

```powershell
# 1. Crea jsi_roleassignment y jsi_onboarding
npm run dry-run
npm run create

# 2. Borra las columnas viejas de contact
npm run remove-columns:dry-run
npm run remove-columns

# 3. Carga el administrador inicial
npm run seed:dry-run
npm run seed
```

## 12. Datos base y reinicio

Los datos base están en archivos, no en el código:

- `data/catalog.json`: 6 áreas, 10 categorías, 8 etapas (Etapas 1 y 2 generales y una Etapa 3 por
  área), 38 documentos con su contenido y 5 preguntas por documento. Tomado del prototipo.
- `data/people.json`: las personas que siempre deben existir (2 administradores y 3 managers).

Para dejar el sistema "como recién instalado" (sin colaboradores ni avances):

```powershell
npm run reset:dry-run     # muestra cuántos registros borraría
npm run reset             # pide escribir REINICIAR
npm run seed              # vuelve a cargar catálogo y personas base
```

`reset` conserva las áreas y a las personas de `people.json`; borra todo lo demás (inducciones,
roles, asignaciones, intentos, evidencias, campañas, documentos y preguntas). No se puede deshacer.

## 13. Migración: de `contact` a la tabla propia `jsi_person`

**Por qué:** `contact` es una tabla estándar que, en un entorno de empresa, comparten otras
apps (en Dynamics 365 representa a clientes). Con `jsi_person` los colaboradores no se mezclan
con otros datos, los permisos se dan solo sobre nuestra tabla y la solución se instala y
desinstala limpia. Además, `jsi_person.jsi_email` tiene una **clave alternativa**: Dataverse no
permite dos personas con el mismo correo.

**Por qué hay que borrar y volver a crear los lookups:** Dataverse no permite cambiar el destino
de una columna lookup. `jsi_onboarding.jsi_employee` apuntaba a `contact`: se borra esa relación
y se crea otra con el mismo nombre de columna que apunta a `jsi_person`.

Se hace **una sola vez**, en este orden (primero el dry-run de cada paso):

```powershell
# 1. Datos: borra roles, inducciones, asignaciones, intentos, evidencias y avisos,
#    y las personas que la app creó en contact. CONSERVA el catálogo.
npm run migrate:person:dry-run
npm run migrate:person          # pide escribir MIGRAR

# 2. Esquema: borra los 11 lookups viejos hacia contact y sus columnas
npm run remove-columns:dry-run
npm run remove-columns

# 3. Esquema: crea jsi_person, los lookups nuevos y la clave del correo
npm run dry-run
npm run create

# 4. Datos: vuelve a crear las personas base y sus roles (sin tocar el catálogo)
npm run seed:people:dry-run
npm run seed:people
```

Después, en la carpeta de la Code App, hay que regenerar los modelos y servicios
(`src/generated`), porque cambió a qué tabla apuntan los lookups:

```powershell
# Quitar la fuente "contact": confirme los parámetros con  pac code delete-data-source --help
pac code delete-data-source -a dataverse -ds contact
pac code add-data-source -a dataverse -t jsi_person
# Las tablas con lookups a la persona:
pac code add-data-source -a dataverse -t jsi_roleassignment
pac code add-data-source -a dataverse -t jsi_onboarding
pac code add-data-source -a dataverse -t jsi_documentassignment
pac code add-data-source -a dataverse -t jsi_assessmentassignment
pac code add-data-source -a dataverse -t jsi_notification
pac code add-data-source -a dataverse -t jsi_evidence
```

Entre el paso 2 y la actualización del código de la app, **la app no funciona** (sus servicios
todavía leen `contact`). Conviene hacerlo en una rama de git.
