# Registro de cambios

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). Versiones con
[versionado semántico](https://semver.org/lang/es/): `MAYOR.MENOR.PARCHE`. Mientras la app no esté
en producción la versión mayor es 0.

## [Sin publicar]

### Seguridad
- Identidad real: en producción la persona es la cuenta de Microsoft Entra ID con la que se abrió
  Power Apps y solo puede entrar con los roles que tiene en Dataverse. El selector simulado queda
  solo para `npm run dev` y no se incluye en el build de producción.
- `odataId()` valida el formato de los ids antes de usarlos en un filtro OData.
- Auditoría de Dataverse (`npm run audit` en dataverse-schema-tool) con retención de 90 días.
- Claves alternativas: correo único por persona y código único por documento.
- Vite actualizado a 7.3.7 (aviso GHSA-rq7h-c2jc-7f22).
- Plantilla de pull request con checklist de seguridad.
- Roles de seguridad de Dataverse declarados en `security-roles.mjs` (`npm run roles`); la evidencia
  no se puede modificar ni borrar.

### Agregado
- 63 pruebas unitarias con Vitest (`npm test`) para las reglas de negocio y las consultas seguras.
- Integración continua en GitHub: lint, pruebas, build y `npm audit` en cada pull request.
- Aviso de bienvenida al validar la ruta de un colaborador (lo enviará Power Automate).
- Paquete de entrega de JLS-ENG-PR01 en `docs/entrega` y decisiones de arquitectura en `docs/adr`.

### Cambiado
- La persona pasa de la tabla estándar `contact` a la tabla propia `jsi_person`
  (esquema y scripts; el código de la app se adapta al regenerar las fuentes de datos).

## [0.4.0] — Gestión de contenido

### Agregado
- Documentos: alta, edición, versiones mayor/menor con historial y aviso a los afectados.
- Rutas de aprendizaje: etapas, áreas por etapa y documentos propuestos por defecto.
- Evaluaciones: editor de preguntas; las ya respondidas se archivan, nunca se modifican.

## [0.3.0] — Equipo y ascensos

### Agregado
- Paneles del Administrador y del Manager, equipo, asignación de documentos, resultados e historial.
- Ascenso a Manager solo con la inducción completada; transferencia de equipos.

## [0.2.0] — Registro e inducción

### Agregado
- Registro de colaboradores, validación por el Manager, lector de documentos y examen por documento.

## [0.1.0] — Base

### Agregado
- Arquitectura modular por rol, modelo de datos en Dataverse y scripts de esquema y datos base.
