# 10 · Informe de vulnerabilidades en código

| Campo | Valor |
| --- | --- |
| Sistema | Onboarding and Micro-learning |
| Versión | 0.4.0 |
| Fecha del análisis | 2026-10-21 |
| Entregable | JLS-ENG-PR01, actividad 5: «informe de vulnerabilidades en código» |
| Alcance | Dependencias (`npm audit`) y revisión manual del código fuente |

Este informe es la revisión del equipo de ingeniería. No reemplaza la prueba de penetración de Cybersecurity (PR01, actividades 8 y 9).

## 1. Dependencias

| Paquete | Ámbito | Resultado | Acción |
| --- | --- | --- | --- |
| App (`npm audit --omit=dev`) | Se publica | **0 vulnerabilidades** | — |
| App, herramientas de desarrollo (`npm audit`) | Solo desarrollo | 0 vulnerabilidades tras actualizar | Vite 7.3.6 → 7.3.7 por GHSA-rq7h-c2jc-7f22 (alta: archivos fuera de `server.fs.allow` en sistemas no Windows) |
| `dataverse-schema-tool` | Herramienta local, no se publica | 2 moderadas: `uuid` < 11.1.1 (GHSA-w5hq-g745-h8pq) a través de `@azure/msal-node` 2 | Riesgo aceptado (R-06): solo afecta a `uuid` v3/v5/v6 con un buffer propio, uso que la herramienta no hace. Se actualiza a `@azure/msal-node` 7 en un cambio aparte |

La CI ejecuta `npm audit --omit=dev --audit-level=high` en cada pull request: una vulnerabilidad alta en lo que se publica detiene el cambio.

## 2. Revisión manual del código

| ID | Hallazgo | Severidad | Estado |
| --- | --- | --- | --- |
| V-01 | Inicio de sesión simulado: cualquier usuario podía elegir rol y persona | Alta | **Corregido**: identidad real en producción; la simulación no entra al build (verificado buscando el proveedor simulado en `dist/`) |
| V-02 | Ids interpolados en filtros OData sin validar | Media | **Corregido**: `odataId()` valida el formato GUID; `anyOf()` lo usa; con prueba unitaria |
| V-03 | Unicidad del correo y del código de documento solo validada en la app | Media | **Corregido**: claves alternativas en Dataverse |
| V-04 | `.env` no estaba excluido en la raíz del repositorio | Media | **Corregido** en `.gitignore` |
| V-05 | Las respuestas correctas del examen llegan al navegador | Media | **Abierto** (R-01): corrección en el servidor en la fase 5 |
| V-06 | Permisos solo en la app | Alta | **Corregido en código**: matriz de roles de Dataverse (`npm run roles`); pendiente aplicarla en cada entorno |
| V-07 | Sin registro de auditoría | Media | **Corregido en código**: `npm run audit:org`; pendiente activarla en cada entorno |

## 3. Verificaciones sin hallazgos

| Verificación | Resultado |
| --- | --- |
| Uso de `dangerouslySetInnerHTML`, `innerHTML` o `eval` | 0 usos |
| Contraseñas, tokens o claves en el repositorio | Ninguno |
| Texto del usuario en filtros OData | Siempre con `odataString()` |
| Datos personales en el registro de la consola | No se registran |
