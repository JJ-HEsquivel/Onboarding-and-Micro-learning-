import { createHashRouter, Navigate, type RouteObject } from 'react-router';
import { roleModules } from '@/modules';
import { AppLayout } from '@/layouts/AppLayout/AppLayout';
import RoleSelectPage from '@/modules/auth/pages/RoleSelectPage';

/**
 * Las rutas se generan a partir de la configuración de cada rol (src/modules/<rol>/<rol>.module.ts).
 * Se usa HashRouter porque la app corre dentro del host de Power Apps.
 */
const roleRoutes: RouteObject[] = roleModules.map((module) => {
  const items = module.navigation.flatMap((section) => section.items);

  return {
    path: module.basePath,
    element: <AppLayout module={module} />,
    children: [
      { index: true, element: <Navigate to={items[0].path} replace /> },
      ...items.map(({ path, page: Page }) => ({ path, element: <Page /> })),
      { path: '*', element: <Navigate to={items[0].path} replace /> },
    ],
  };
});

export const router = createHashRouter([
  { path: '/', element: <RoleSelectPage /> },
  ...roleRoutes,
  { path: '*', element: <Navigate to="/" replace /> },
]);
