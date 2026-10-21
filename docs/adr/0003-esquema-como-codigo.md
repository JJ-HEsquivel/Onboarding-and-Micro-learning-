# ADR 0003 · El esquema de Dataverse se define como código

- **Estado:** Aceptada
- **Fecha:** 2026-08

## Contexto

El modelo tiene 23 tablas y 42 relaciones. Crearlas a mano en make.powerapps.com es lento, propenso a errores y no deja registro de qué cambió, cuándo ni por qué (JLS-EIS-PO12, control de cambios).

## Decisión

Declarar tablas, columnas, relaciones, claves, roles de seguridad y auditoría en archivos (`schema.mjs`, `security-roles.mjs`) y aplicarlos con scripts idempotentes de `dataverse-schema-tool`, todos con modo `--dry-run`.

## Alternativas consideradas

| Alternativa | Por qué no |
| --- | --- |
| Crear el esquema a mano en el portal | Sin historial ni revisión; difícil de repetir en otro entorno |
| Solo exportar la solución | Sirve para mover entre entornos (y se usa para eso), pero el archivo exportado es difícil de revisar en un pull request |

## Consecuencias

- Todo cambio de esquema pasa por un pull request y queda en el historial de git.
- Un entorno nuevo se arma con comandos documentados ([04 · Guía de instalación](../entrega/04-guia-de-instalacion.md)).
- Los scripts nunca borran: borrar exige `remove-columns.mjs` y una lista explícita.
- El diagrama ER se genera desde el esquema (`docs/scripts/build-er-diagram.mjs`).
