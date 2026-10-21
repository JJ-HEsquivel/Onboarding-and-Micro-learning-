# 04 · Guía de instalación

| Campo | Valor |
| --- | --- |
| Sistema | Onboarding and Micro-learning |
| Versión | 0.4.0 |
| Entregable | JLS-ENG-PR01, actividad 7: «Guía del proceso de instalación» |
| Resultado | El sistema funcionando en un entorno de Power Platform vacío |

## 1. Requisitos previos

| Requisito | Detalle |
| --- | --- |
| Entorno de Power Platform | Con base de datos Dataverse y Code Apps habilitadas |
| Rol en el entorno | System Customizer o System Administrator (para crear el esquema); System Administrator para activar la auditoría del entorno |
| Licencia | Power Apps Premium para cada usuario de la app |
| Node.js | 22 LTS o superior |
| Power Platform CLI | `pac` instalado |
| Git | Para clonar el repositorio |

## 2. Instalación paso a paso

### Paso 1 · Obtener el código

```powershell
git clone <url-del-repositorio>
cd Onboarding-and-Micro-learning
npm ci
```

### Paso 2 · Conectar con el entorno

```powershell
pac auth create --name "<perfil>" --environment "https://<org>.crm.dynamics.com"
```

En `dataverse-schema-tool`, copiar `.env.example` a `.env` y completar `DATAVERSE_URL` con la misma URL.

### Paso 3 · Crear el esquema de Dataverse

Dentro de `dataverse-schema-tool` (`npm install` la primera vez). Ejecutar siempre primero el dry-run de cada paso:

```powershell
npm run dry-run              # revisar lo que se creará
npm run create               # publisher, solución, 23 tablas, relaciones, claves únicas
npm run roles:dry-run
npm run roles                # 3 roles de seguridad
npm run audit:dry-run
npm run audit:org            # auditoría del entorno (90 días) y de cada tabla
```

Verificar en make.powerapps.com > Soluciones > **Onboarding and Micro-learning** que estén las tablas y los roles.

### Paso 4 · Datos base

Solo en desarrollo y pruebas (los datos de ejemplo son ficticios):

```powershell
npm run seed:dry-run
npm run seed                 # áreas, etapas, 38 documentos, evaluaciones y personas base
```

En producción, los datos base del programa (áreas, etapas y documentos reales) los carga el Administrador desde la app o con un `catalog.json` aprobado; las personas, con su correo corporativo real.

### Paso 5 · Conectar la app con las tablas

En la raíz del proyecto, una vez por tabla:

```powershell
pac code add-data-source -a dataverse -t jsi_person
pac code add-data-source -a dataverse -t jsi_roleassignment
# … una por cada tabla jsi_ (lista completa en power.config.json)
```

### Paso 6 · Probar y publicar

```powershell
npm run lint
npm test
npm run build
pac code push
```

### Paso 7 · Dar acceso a los usuarios

En el Centro de administración de Power Platform > Entorno > Usuarios, a cada persona:

1. El rol estándar **Basic User**.
2. Su rol del sistema: **Onboarding - Administrador**, **Onboarding - Manager** u **Onboarding - Colaborador**.
3. Compartir la app con ella (o con su grupo de seguridad).

Además, la persona debe estar registrada en la app (`jsi_person`) con el **mismo correo** de su cuenta y con su rol en `jsi_roleassignment`.

## 3. Comprobación final

Abrir la app con una cuenta de cada rol. Debe mostrar «Hola, <nombre>» y solo los perfiles de esa persona. Si muestra «La cuenta … no está registrada», falta el paso 7.

## 4. Problemas frecuentes

| Síntoma | Causa | Solución |
| --- | --- | --- |
| «Data source not found» al abrir en desarrollo | Se abrió con una cuenta de otro tenant | Abrir con la cuenta del entorno (ventana privada) |
| `The language code 1033 is not a valid language` | Versión antigua del script | Actualizar el repositorio: el script detecta el idioma del entorno |
| `403 Insufficient privileges` en los scripts | Falta el rol de personalización | Pedir System Customizer en el entorno |
| La app no muestra perfiles | La persona no tiene rol en `jsi_roleassignment` | Asignarlo desde la app (Administrador) |
