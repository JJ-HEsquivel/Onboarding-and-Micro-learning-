import { createHashRouter, Navigate } from 'react-router';
import RoleSelectPage from '@/modules/auth/pages/RoleSelectPage';

/**
 * Qué pantalla se muestra en cada dirección.
 * Se usa HashRouter (direcciones con "#") porque la app corre dentro de Power Apps.
 * En la parte 2 se agregan las pantallas de cada rol.
 */
export const router = createHashRouter([
  { path: '/', element: <RoleSelectPage /> },
  { path: '*', element: <Navigate to="/" replace /> },
]);
