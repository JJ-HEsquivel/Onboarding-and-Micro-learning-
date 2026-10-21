# ADR 0001 · Power Apps Code Apps con React

- **Estado:** Aceptada
- **Fecha:** 2026-08

## Contexto

El sistema necesita varias pantallas por rol, reglas de negocio con cálculos (avance, riesgo, vencimientos en días hábiles), formularios con validación y una interfaz cuidada. Debe correr dentro de Microsoft 365, con la identidad de la organización, y guardar los datos en Dataverse.

## Decisión

Construir una **Power Apps Code App** con React y TypeScript, publicada con `pac code push`.

## Alternativas consideradas

| Alternativa | Por qué no |
| --- | --- |
| App de lienzo (Canvas) | Las reglas complejas en Power Fx son difíciles de probar y de revisar en un pull request; el control de versiones es limitado |
| App basada en modelo (Model-driven) | Buena para formularios de datos, pero no para la experiencia de lectura y examen que necesita el colaborador |
| Aplicación web propia (Azure) | Exige servidor, identidad y seguridad propios; más costo y más superficie de ataque |

## Consecuencias

- El código vive en Git, con revisión por pull request, pruebas unitarias y CI.
- La autenticación, el hosting y el acceso a Dataverse los da la plataforma.
- El equipo necesita conocer React y TypeScript.
- Los modelos y servicios de datos se generan con `pac code add-data-source` y no se editan a mano.
