/**
 * Cómo se identifica a la persona que usa la app.
 *
 * - Identidad REAL (siempre en producción: `npm run build` → `pac code push`): la cuenta de
 *   Microsoft Entra ID con la que se abrió Power Apps. La persona se busca por su correo y
 *   solo puede entrar con los roles que tiene asignados en Dataverse (jsi_roleassignment).
 * - SIMULACIÓN (solo con `npm run dev`): se elige cualquier rol y persona, para probar con los
 *   datos de ejemplo, cuyas cuentas no existen. Se desactiva en desarrollo con
 *   `VITE_ROLE_SIMULATION=false` en un archivo `.env.local`.
 *
 * `import.meta.env.DEV` lo fija Vite al compilar: en el build de producción vale `false`,
 * así que la simulación no llega nunca a producción.
 */
export const ROLE_SIMULATION: boolean = import.meta.env.DEV && import.meta.env.VITE_ROLE_SIMULATION !== 'false';
