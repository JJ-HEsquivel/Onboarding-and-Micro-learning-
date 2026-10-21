## Qué cambia y por qué

<!-- Qué se pidió (issue, tarea o persona que lo aprobó) y qué hace este cambio. -->

## Componentes afectados

- [ ] App (src/)
- [ ] Esquema de Dataverse (dataverse-schema-tool/schema.mjs) — ¿hay que ejecutar algún script? ¿Cuál y en qué orden?
- [ ] Datos base o scripts de datos
- [ ] Flujos de Power Automate
- [ ] Documentación

## Cómo se probó

<!-- Pasos para comprobarlo y con qué rol. -->

## Checklist de seguridad (política JLS-EIS-PO33 · Desarrollo Seguro)

- [ ] Los datos de entrada se validan: obligatorios, formato, longitud y rango (números, fechas, correos).
- [ ] Ningún texto del usuario se pega en un filtro OData sin `odataString()`, y ningún id sin `odataId()`.
- [ ] No se usa `dangerouslySetInnerHTML` ni se arma HTML con texto del usuario.
- [ ] No hay contraseñas, tokens, ni archivos `.env` en el commit.
- [ ] Las pantallas nuevas quedan dentro del módulo de su rol (y no se exponen a otros roles).
- [ ] Los cambios importantes dejan rastro (evidencia o auditoría de Dataverse).
- [ ] No se usaron datos reales de producción para probar.
- [ ] `npm run build` y `npm run lint` pasan sin errores; `npm audit --omit=dev` sin vulnerabilidades altas.
- [ ] Se actualizó la documentación (README, modelo ER, CHANGELOG) si corresponde.

## Revisión

Se necesita la aprobación de al menos un compañero antes de unir a `main` (revisión cruzada).
