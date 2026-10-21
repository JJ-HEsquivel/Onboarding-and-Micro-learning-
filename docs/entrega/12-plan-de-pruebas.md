# 12 · Plan de pruebas

| Campo | Valor |
| --- | --- |
| Sistema | Onboarding and Micro-learning |
| Versión | 0.4.0 |
| Entregable | JLS-ENG-PR01, actividades 3 y 4: «pruebas unitarias, de integración y funcionales» y «validar en staging» |

## 1. Niveles de prueba

| Nivel | Qué cubre | Herramienta | Cuándo | Estado |
| --- | --- | --- | --- | --- |
| Estática | Tipos, estándares de código | TypeScript `strict`, ESLint | Cada pull request (CI) | Implementado |
| Unitaria | Reglas de negocio y utilidades | Vitest | Cada pull request (CI) | **Implementado: 63 pruebas** |
| Dependencias | Vulnerabilidades conocidas | `npm audit` | Cada pull request (CI) | Implementado |
| Integración | Servicios contra un Dataverse real | Entorno de pruebas + datos de ejemplo | Antes de cada pase | Pendiente (requiere entorno de pruebas) |
| Funcional | Casos de uso por rol (sección 3) | Manual con usuarios clave | Antes de cada pase | Casos definidos |
| Seguridad | Prueba de penetración | Cybersecurity | Antes del primer pase a producción | Pendiente (ticket) |

## 2. Pruebas unitarias

```powershell
npm test            # una vez
npm run test:watch  # mientras se programa
```

| Archivo | Qué verifica | Pruebas |
| --- | --- | --- |
| `shared/domain/onboardingProgress.test.ts` | Pasos de cada documento, avance, estado (no empezado, en curso, atrasado, completado) y riesgo | 10 |
| `shared/domain/attention.test.ts` | Motivos de «Requiere atención» | 6 |
| `shared/domain/documentVersion.test.ts` | Versión siguiente, comparación y formato | 11 |
| `shared/domain/assessmentChanges.test.ts` | Una pregunta respondida nunca se modifica; validación de preguntas | 10 |
| `shared/lib/dates.test.ts` | Días hábiles, días corridos | 4 |
| `shared/lib/format.test.ts` | Iniciales, búsqueda sin tildes, plurales, diferencias de conjuntos | 5 |
| `services/dataverse.test.ts` | Consultas seguras (inyección), manejo de errores | 11 |
| `services/onboardingRoute.service.test.ts` | Ruta por área, documentos propuestos, vencimientos por etapa | 6 |

## 3. Casos de prueba funcionales

| ID | Rol | Caso | Resultado esperado |
| --- | --- | --- | --- |
| F-01 | Cualquiera | Abrir la app con una cuenta no registrada | Mensaje «La cuenta … no está registrada»; no ve ningún perfil |
| F-02 | Cualquiera | Abrir con una cuenta registrada con un rol | Ve solo ese perfil |
| F-03 | Administrador | Registrar un colaborador con un correo ya usado | Error de correo repetido; no se crea nada |
| F-04 | Administrador | Registrar un colaborador | Queda «Pendiente de validación» con la ruta propuesta |
| F-05 | Manager | Validar la ruta quitando un documento de la Etapa 3 | La ruta queda sin ese documento, con vencimientos, y el colaborador recibe la bienvenida |
| F-06 | Colaborador | Confirmar la lectura de un documento | Se habilita su examen con 3 días de plazo y se guarda la evidencia |
| F-07 | Colaborador | Reprobar 3 veces un examen | Queda «Intentos agotados» y aparece en «Requiere atención» |
| F-08 | Administrador | Habilitar un nuevo intento | El colaborador puede volver a rendir |
| F-09 | Colaborador | Aprobar todos los documentos | La inducción queda «Completada» |
| F-10 | Administrador | Ascender a un colaborador sin la inducción completa | La app no lo permite |
| F-11 | Administrador | Publicar una versión mayor de un documento ya leído por alguien en curso | Esa persona debe releerlo y recibe un aviso |
| F-12 | Administrador | Editar una pregunta ya respondida | La original queda archivada y se crea una nueva |
| F-13 | Administrador | Crear un documento con un código repetido | Error de código repetido |
| F-14 | Colaborador | Cambiar el rol guardado en el almacenamiento del navegador a «admin» | Vuelve a la elección de perfil; no entra como Administrador |

## 4. Criterio de salida para un pase

CI en verde, los 14 casos funcionales aprobados en el entorno de pruebas y, en el primer pase a producción, la prueba de penetración aprobada por Cybersecurity.
