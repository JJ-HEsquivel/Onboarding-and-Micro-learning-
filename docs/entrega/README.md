# Paquete de entrega · Onboarding and Micro-learning

| Campo | Valor |
| --- | --- |
| Sistema | Onboarding and Micro-learning |
| Versión | 0.4.0 |
| Fecha | 2026-10-21 |
| Equipo | Equipo de ingeniería del proyecto |
| Procedimiento | JLS-ENG-PR01 · Transición de productos de ingeniería a Infraestructura Tecnológica |
| Políticas aplicadas | JLS-EIS-PO33 · Desarrollo Seguro · JLS-EIS-PO12 · Adquisición, Desarrollo y Mantenimiento de Sistemas de Información |

## Índice

| # | Documento | Actividad de PR01 que cubre |
| --- | --- | --- |
| 01 | [Tecnología usada](01-tecnologia-usada.md) | 7 · Tecnología usada |
| 02 | [Arquitectura](02-arquitectura.md) | 7 · Diagramas de arquitectura |
| 03 | [Despliegue](03-despliegue.md) | 5 · Procedimientos de despliegue · 7 · Diagrama de despliegue · 10 a 14 · Plan, rollback y verificación |
| 04 | [Guía de instalación](04-guia-de-instalacion.md) | 7 · Guía del proceso de instalación |
| 05 | [Configuración](05-configuracion.md) | 5 · Configuraciones |
| 06 | [Funcionalidades](06-funcionalidades.md) | 5 · Funcionalidades |
| 07 | [APIs y monitoreo](07-apis-y-monitoreo.md) | 5 · Endpoints · 7 · APIs expuestas para monitoring |
| 08 | [Seguridad y riesgos](08-seguridad-y-riesgos.md) | 7 · Resumen de los puntos de riesgo · PO33 · PO12 |
| 09 | [Ambientes](09-ambientes.md) | 7 · Información de los ambientes existentes |
| 10 | [Informe de vulnerabilidades](10-informe-de-vulnerabilidades.md) | 5 · Informe de vulnerabilidades en código |
| 11 | [Estándares de codificación](11-estandares-de-codificacion.md) | 2 · Estándares de codificación y buenas prácticas |
| 12 | [Plan de pruebas](12-plan-de-pruebas.md) | 3 y 4 · Pruebas unitarias, de integración y funcionales |
| 13 | [Pendientes del proceso](13-pendientes-del-proceso.md) | Lo que falta, por responsable |

## Documentos relacionados

| Documento | Ubicación |
| --- | --- |
| Notas de versión | [`CHANGELOG.md`](../../CHANGELOG.md) |
| Proceso de cambios y trabajo en equipo | [`CONTRIBUTING.md`](../../CONTRIBUTING.md) |
| Decisiones de arquitectura (ADR) | [`docs/adr`](../adr) |
| Modelo de datos | [`docs/modelo-entidad-relacion.md`](../modelo-entidad-relacion.md) · [diagrama interactivo](../modelo-er-grafico.html) |
| Herramienta de esquema | [`dataverse-schema-tool/README.md`](../../dataverse-schema-tool/README.md) |

## Estado de las actividades de PR01

| Actividad | Estado |
| --- | --- |
| 1 · Funcionalidades completas y versionadas | Fases 1 a 4 completas; fase 5 pendiente |
| 2 · Revisión por pares y estándares | Cumplido: pull request, checklist, CI, documento 11 |
| 3 · Pruebas unitarias, de integración y funcionales | Unitarias en CI (63); integración y funcionales definidas, se ejecutan en el entorno de pruebas |
| 4 · Validación en staging | Pendiente: requiere el entorno de pruebas |
| 5 · Documentación | Cumplido: documentos 03, 05, 06, 07, 10 y CHANGELOG |
| 6 · Aprobación formal | Pendiente: Responsable del Proyecto |
| 7 · Documentación al Responsable | Cumplido: documentos 01, 02, 03, 04, 07, 08, 09 |
| 8 y 9 · Pentest | Pendiente: ticket a Cybersecurity |
| 10 a 14 · Despliegue y verificación | Plan y verificación definidos en el documento 03 |
| 15 a 18 · Cierre y transferencia | Después del primer despliegue |
