# 06 · Funcionalidades

| Campo | Valor |
| --- | --- |
| Sistema | Onboarding and Micro-learning |
| Versión | 0.4.0 |
| Entregable | JLS-ENG-PR01, actividad 5: «Documentar funcionalidades» |

Estado: **Disponible** = funciona con datos reales · **Fase 5** = pantalla reservada, se construye en la fase siguiente.

## 1. Acceso

| Funcionalidad | Estado | Descripción |
| --- | --- | --- |
| Ingreso con la cuenta de la organización | Disponible | La persona se identifica por su correo; solo ve los perfiles que tiene asignados |
| Varios roles por persona | Disponible | Quien es Manager y Administrador elige con qué perfil entra |
| Modo de prueba | Solo desarrollo | Elegir cualquier rol y persona con `npm run dev`; no existe en producción |

## 2. Administrador (`/admin`)

| Pantalla | Ruta | Estado | Qué permite |
| --- | --- | --- | --- |
| Panel general | `/admin/panel` | Disponible | Indicadores del programa, estado por área, colaboradores que requieren atención |
| Colaboradores | `/admin/colaboradores` | Disponible | Listado con filtros y exportación CSV; registrar un colaborador con su ruta propuesta; ficha con historial, recordar, habilitar un nuevo intento, dar de baja |
| Managers y ascensos | `/admin/managers` | Disponible | Ascender a Manager (solo con la inducción completa), transferir equipos, revertir un ascenso |
| Documentos | `/admin/documentos` | Disponible | Crear y editar documentos, publicar versiones mayores o menores, historial de versiones |
| Rutas de aprendizaje | `/admin/rutas` | Disponible | Crear y editar etapas, áreas por etapa, documentos propuestos por defecto, vista previa por área |
| Evaluaciones | `/admin/evaluaciones` | Disponible | Configurar nota mínima, intentos y duración; editar preguntas; ver intentos y tasa de aprobación |
| Micro aprendizaje | `/admin/micro-aprendizaje` | Fase 5 | Campañas de refuerzo |
| Analítica y brechas | `/admin/analitica` | Fase 5 | Brechas de comprensión por documento |
| Automatizaciones | `/admin/automatizaciones` | Fase 5 | Estado de los flujos de Power Automate |
| Evidencias | `/admin/evidencias` | Fase 5 | Consulta de evidencias para auditoría |
| Configuración | `/admin/configuracion` | Fase 5 | Reglas del programa editables |

## 3. Manager (`/manager`)

| Pantalla | Ruta | Estado | Qué permite |
| --- | --- | --- | --- |
| Panel del equipo | `/manager/panel` | Disponible | Avance de su equipo y quién requiere atención |
| Nuevos por validar | `/manager/por-validar` | Disponible | Revisar la ruta propuesta, sumar o quitar documentos de la Etapa 3 y validarla |
| Colaboradores | `/manager/colaboradores` | Disponible | Su equipo con su avance; ficha y recordatorios |
| Asignar documentos | `/manager/asignar-documentos` | Disponible | Sumar documentos de la Etapa 3 de su área a un colaborador |
| Documentos | `/manager/documentos` | Disponible | Leer el contenido de los documentos (solo lectura) |
| Resultados | `/manager/resultados` | Disponible | Resultados de los exámenes de su equipo |
| Historial de inducción | `/manager/historial` | Disponible | Su propia inducción si llegó a Manager por ascenso |
| Escalamientos | `/manager/escalamientos` | Fase 5 | Casos escalados por atrasos |
| Brechas del equipo | `/manager/brechas` | Fase 5 | Temas con más errores en su equipo |

## 4. Colaborador (`/colaborador`)

| Pantalla | Ruta | Estado | Qué permite |
| --- | --- | --- | --- |
| Mi progreso | `/colaborador/progreso` | Disponible | Avance por etapa y próximos vencimientos |
| Inducción | `/colaborador/induccion` | Disponible | Leer cada documento, confirmar la lectura y rendir su examen |
| Mis evaluaciones | `/colaborador/evaluaciones` | Disponible | Exámenes pendientes, aprobados y reprobados |
| Mis constancias | `/colaborador/constancias` | Disponible | Sus evidencias: cada lectura confirmada y cada examen rendido, con fecha, versión y resultado |
| Micro aprendizaje | `/colaborador/micro-aprendizaje` | Fase 5 | Evaluaciones cortas de refuerzo |
| Asistente documental | `/colaborador/asistente` | Fase 5 | Búsqueda en los documentos del programa |

## 5. Reglas del programa

| Regla | Valor |
| --- | --- |
| Etapas | 1 y 2 generales (todas las áreas); 3 por área |
| Un documento «suma» | Cuando su lectura está confirmada **y** su examen aprobado |
| Aprobación de un examen | 80 % por defecto, 3 intentos |
| Plazo del examen | 3 días corridos desde que se confirma la lectura |
| Plazo de cada etapa | En días hábiles, acumulados en orden (5 + 5 + 5 por defecto) |
| Inducción completada | Todos los documentos de la ruta aprobados |
| Ascenso a Manager | Solo con la inducción completada |
| Versión mayor de un documento | Quien sigue en inducción y ya lo leyó debe releerlo y volver a rendir su examen |
| Preguntas ya respondidas | Nunca se modifican: se archivan y se crea una nueva |
