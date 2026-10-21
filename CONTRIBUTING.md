# Cómo trabajamos en este repositorio

Reglas para trabajar en equipo de acuerdo con las políticas JLS-EIS-PO33 (Desarrollo Seguro) y
JLS-EIS-PO12 (Adquisición, Desarrollo y Mantenimiento de Sistemas de Información).

## Ramas

- `main`: lo aprobado. Nadie hace commit directo a `main`.
- `feature/<tema>`: una rama por cambio (ej. `feature/person-table`).
- `fix/<tema>`: correcciones.

## Cambios

1. Cada cambio nace de una tarea o pedido aprobado (dejarlo anotado en el pull request).
2. Se trabaja en una rama y se abre un **pull request** hacia `main`, con la plantilla y su
   checklist de seguridad completos.
3. Otro integrante del equipo **revisa y aprueba** antes de unir (revisión cruzada).
4. Si el cambio toca el esquema de Dataverse, el PR dice qué scripts ejecutar y en qué orden.
5. Se actualiza el [CHANGELOG](CHANGELOG.md) y, si corresponde, la documentación de `docs/`.

## Antes de abrir el pull request

```powershell
npm run lint
npm run build
npm audit --omit=dev
```

## Secretos y datos

- Nunca se suben archivos `.env`, contraseñas ni tokens. Los scripts inician sesión con la cuenta
  de cada uno (código de dispositivo); no guardan credenciales.
- Para probar se usan los datos ficticios de `dataverse-schema-tool/data`. Nunca datos reales de
  producción. Si hiciera falta una copia, primero se despersonaliza y se pide autorización al Manager.

## Entornos

| Entorno | Para qué | Quién publica |
| --- | --- | --- |
| Desarrollo | Construir y probar (`npm run dev`, scripts de esquema) | Cada desarrollador |
| Pruebas (QA) | Validación con usuarios clave | Pipeline de Power Platform |
| Producción | Uso real | Pipeline, con aprobación del responsable del proyecto |

El esquema y la app viajan entre entornos dentro de la solución `OnboardingMicroLearning`;
los datos no viajan.
