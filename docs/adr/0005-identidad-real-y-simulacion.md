# ADR 0005 · Identidad real en producción; simulación solo en desarrollo

- **Estado:** Aceptada
- **Fecha:** 2026-10-21

## Contexto

Las primeras versiones permitían elegir cualquier rol y cualquier persona en la pantalla de inicio, para probar con los datos de ejemplo. En producción eso permitiría a cualquiera entrar como Administrador (JLS-EIS-PO33, autenticación robusta y gestión de roles).

## Decisión

- **Producción:** la persona es la cuenta de Microsoft Entra ID con la que se abrió Power Apps (`getContext()` del SDK). Se busca por su correo en `jsi_person` y solo puede entrar con los roles activos que tiene en `jsi_roleassignment`. Del navegador solo se recuerda el rol elegido, y se vuelve a comprobar en cada carga.
- **Desarrollo:** con `npm run dev` se mantiene el selector simulado, con un aviso visible, porque las personas de ejemplo no tienen cuenta. Se puede desactivar con `VITE_ROLE_SIMULATION=false`.
- La decisión se toma al compilar (`import.meta.env.DEV`): el build de producción no contiene el proveedor simulado.

## Consecuencias

- Para entrar, una persona debe estar registrada con el mismo correo de su cuenta.
- El menú por rol es una ayuda de la interfaz; los permisos sobre los datos los hacen cumplir los roles de seguridad de Dataverse (ver [08 · Seguridad](../entrega/08-seguridad-y-riesgos.md)).
- Las pruebas con varios roles se hacen en desarrollo o con cuentas de prueba reales en el entorno de pruebas.
