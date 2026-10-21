# 09 · Ambientes

| Campo | Valor |
| --- | --- |
| Sistema | Onboarding and Micro-learning |
| Versión | 0.4.0 |
| Entregable | JLS-ENG-PR01, actividad 7: «Información de los ambientes existentes (preproducción, pruebas, etc.)» |

## 1. Ambientes

| Ambiente | Estado | Tipo de entorno | Solución | Datos | Quién publica |
| --- | --- | --- | --- | --- | --- |
| Desarrollo | **Existe** | Power Platform (Developer / Sandbox) | No administrada | Ficticios (`npm run seed`) | Cada desarrollador (`pac code push`, scripts) |
| Pruebas (QA) | Por crear | Sandbox | Administrada | De prueba o copia despersonalizada autorizada | Pipeline |
| Producción | Por crear | Production | Administrada | Reales | Pipeline, con aprobación del Responsable del Proyecto |

El ambiente de desarrollo actual es un entorno académico de prueba de concepto. Los ambientes de la organización (desarrollo, pruebas y producción) los provee el área de Technology and Transformation; el código y la solución se trasladan sin cambios, porque nada del sistema depende del entorno en el que se creó.

## 2. Qué cambia en cada ambiente

| Elemento | Cómo se configura |
| --- | --- |
| URL de Dataverse | `power.config.json` (app, lo escribe `pac code init`) y `.env` (scripts) |
| Usuarios y roles | Centro de administración: Basic User + rol del sistema |
| Auditoría | `npm run audit:org` o Centro de administración, en el primer despliegue |
| Conexiones de flujos | Referencias de conexión de la solución, con una cuenta de servicio |
| Datos base | Desarrollo y pruebas: `npm run seed`. Producción: carga del Administrador |

## 3. Reglas

- No se usan datos de producción en desarrollo ni en pruebas (JLS-EIS-PO12, protección de datos de prueba).
- Nadie edita la solución directamente en pruebas o producción: todo cambio nace en desarrollo y llega por el pipeline.
- Cada ambiente tiene sus propios usuarios y permisos.
