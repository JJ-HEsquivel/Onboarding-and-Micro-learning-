# ADR 0004 · La evidencia y las preguntas respondidas nunca se modifican

- **Estado:** Aceptada
- **Fecha:** 2026-10

## Contexto

La inducción tiene valor de cumplimiento: una auditoría puede pedir qué documento leyó una persona, en qué versión, cuándo, y qué respondió en su examen. Si una pregunta se edita después de respondida, la respuesta guardada deja de corresponder a lo que se preguntó.

## Decisión

- `jsi_evidence` solo se crea y se lee: ningún rol de seguridad tiene permiso para modificarla ni borrarla.
- Una pregunta que alguien ya respondió no se modifica ni se borra: se **archiva** (`jsi_active = false`) y, si se editó, se crea una nueva. Las reglas están en `src/shared/domain/assessmentChanges.ts`, con pruebas.
- Las relaciones de Dataverse son `Restrict`: no se puede borrar un registro del que dependen otros.

## Consecuencias

- Cada respuesta guardada muestra exactamente la pregunta que se respondió.
- Los exámenes acumulan preguntas archivadas; solo las activas se muestran.
- Las etapas y los documentos no se borran; se retiran (borrador) o se dejan de usar.
