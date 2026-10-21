# 13 · Pendientes del proceso

| Campo | Valor |
| --- | --- |
| Sistema | Onboarding and Micro-learning |
| Versión | 0.4.0 |
| Fecha | 2026-10-21 |
| Propósito | Lo que exigen JLS-EIS-PO33, JLS-EIS-PO12 y JLS-ENG-PR01 y todavía no está hecho |

Se dividen en tres grupos: lo que el equipo debe **ejecutar** (el código ya está), lo que el equipo debe **construir** y lo que depende de **otras áreas** de la organización.

## 1. Ejecutar (el código está listo)

| # | Pendiente | Comando o acción | Requisito |
| --- | --- | --- | --- |
| E-1 | Terminar la migración de la persona a `jsi_person` | `npm run create`, `npm run seed:people`, regenerar fuentes de datos con `pac`, adaptar los servicios | Rama `feature/person-table` |
| E-2 | Crear los roles de seguridad de Dataverse | `npm run roles:dry-run` y `npm run roles` | System Customizer |
| E-3 | Activar la auditoría del entorno (90 días) | `npm run audit:dry-run` y `npm run audit:org` | System Administrator del entorno |
| E-4 | Proteger la rama `main` en GitHub | Settings > Branches: exigir 1 aprobación y el check «CI» | Dueño del repositorio |
| E-5 | Asignar roles a los usuarios | Centro de administración: Basic User + rol del sistema | System Administrator |

## 2. Construir (trabajo del equipo)

| # | Pendiente | Exigido por | Riesgo que cierra |
| --- | --- | --- | --- |
| C-1 | Corrección de exámenes en el servidor (Power Automate o Custom API) | PO33 «controles para detectar anomalías» | R-01 |
| C-2 | Vincular cada persona con su cuenta (`jsi_user`) y bajar el alcance del rol Colaborador a «Usuario» | PO33 «gestión de roles y permisos» | R-02 |
| C-3 | Flujos de Power Automate: envío de avisos, recordatorios y escalamiento, recálculo diario del avance | Funcionalidad de la fase 5; PO12 «transacciones entre aplicaciones» | R-05 |
| C-4 | Registro de cada ejecución de flujo en Dataverse (Power Automate guarda solo 28 días) | PO12 «logs de 30 días» | — |
| C-5 | Reglas de negocio de Dataverse para columnas obligatorias | PO33 «validaciones en la entrada de datos» | R-04 |
| C-6 | Pantallas de la fase 5: micro aprendizaje, analítica, escalamientos, evidencias, configuración, asistente | Alcance del producto | — |
| C-7 | Actualizar `@azure/msal-node` a la versión 7 en la herramienta de esquema | PO33 «librerías confiables» | R-06 |

## 3. Depende de otras áreas (PR01)

| # | Pendiente | Responsable | Actividad PR01 |
| --- | --- | --- | --- |
| O-1 | Mover el repositorio al repositorio oficial de la organización | Management de Ingeniería | 1 |
| O-2 | Crear los entornos de pruebas y producción, con pipeline | Technology and Transformation | 4, 10 |
| O-3 | Definir publisher y prefijo oficiales (hoy `jsi`) antes de crear el esquema en la organización | Technology and Transformation | — |
| O-4 | Cuenta de servicio y política de datos (DLP) para los flujos | Technology and Transformation | — |
| O-5 | Designar al Responsable del Proyecto que aprueba los pases | Management de Ingeniería | 6, 11 |
| O-6 | Prueba de penetración: ticket «Solicitud de Pentest/identificación de vulnerabilidades» | Equipo de ingeniería solicita, Cybersecurity ejecuta | 8, 9 |
| O-7 | Validación con usuarios clave en el entorno de pruebas | Responsable del Proyecto | 4, 14 |
| O-8 | Ticket «Production Infrastructure» dentro de los 3 meses del primer despliegue | Responsable del Proyecto | 17 |
| O-9 | Revisión de la documentación por Technological Infrastructure (1 mes) | Technological Infrastructure | 18 |
| O-10 | Conexión con Azure Application Insights para alertas | Technology and Transformation | 12, 13 |

## 4. Orden recomendado

1. E-1 a E-5 (se pueden hacer ya).
2. O-3 y O-5 antes de crear nada en la organización.
3. C-1, C-2 y C-3 (los riesgos altos y la fase 5).
4. O-2 y O-7, luego O-6.
5. Primer pase a producción con el plan de [03 · Despliegue](03-despliegue.md); después O-8 y O-9.
