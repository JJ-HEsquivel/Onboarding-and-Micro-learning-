# ADR 0002 · Tabla propia `jsi_person` en lugar de `contact`

- **Estado:** Aceptada · reemplaza el uso de `contact` de las versiones 0.1 a 0.4
- **Fecha:** 2026-10-20

## Contexto

La persona (colaborador, manager o administrador) se guardaba en la tabla estándar `contact`, extendida con columnas `jsi_`. En los entornos de la organización, `contact` la pueden usar otras aplicaciones (en Dynamics 365 representa a clientes y personas externas).

## Decisión

Crear la tabla propia **`jsi_person`** y apuntar a ella los 10 lookups que apuntaban a `contact`. El correo es único (clave alternativa `jsi_person_email_key`). La columna `jsi_user` vincula a la persona con su usuario de la organización (`systemuser`).

## Alternativas consideradas

| Alternativa | Por qué no |
| --- | --- |
| Seguir con `contact` | Datos mezclados con otras apps, permisos sobre toda la tabla, reglas y flujos de otros equipos que afectan a esta app |
| Usar `systemuser` como persona | No se pueden crear filas desde la app, y un colaborador nuevo puede no tener cuenta todavía |

## Consecuencias

- La solución se instala y se desinstala sin tocar tablas de otros.
- Los permisos se otorgan solo sobre la tabla de esta app.
- Hubo que migrar una vez (`migrate-contact-to-person.mjs`) y regenerar las fuentes de datos.
- El nombre completo lo arma la app («Nombres Apellidos»); en `contact` lo calculaba Dataverse.
