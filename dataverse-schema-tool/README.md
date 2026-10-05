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
Mismo login. Esta vez el script si crea publisher, solution, 20 tablas
personalizadas, sus columnas, las relaciones, y agrega las columnas nuevas a
la tabla estandar `contact` (Employee). Al final publica los cambios
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
pac code add-data-source -a dataverse -t contact
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
├── package.json
├── .env.example         <- Plantilla (sin datos reales)
├── .env                 <- TU creas este archivo, con tus valores (no se sube a git)
├── .gitignore
└── README.md            <- Este archivo
```

Si necesitas agregar una tabla o columna nueva más adelante, edítala en
`schema.mjs` (siguiendo el mismo patrón) y vuelve a correr
`npm run create` — el script solo creará lo nuevo.
