import { lazy } from 'react';
import { Award, Bell, BookOpen, ChartLine, FileText, House, SquareCheckBig, TriangleAlert, Users } from 'lucide-react';
import { ROLE } from '@/shared/constants/choices';
import type { RoleModule } from '@/shared/types/navigation';
// Cada pantalla se descarga recién cuando se abre (code splitting).
const ManagerDashboardPage = lazy(() => import('./pages/dashboard/ManagerDashboardPage'));
const ManagerPendingValidationPage = lazy(() => import('./pages/pending-validation/ManagerPendingValidationPage'));
const ManagerTeamPage = lazy(() => import('./pages/team/ManagerTeamPage'));
const ManagerAssignDocumentsPage = lazy(() => import('./pages/assign/ManagerAssignDocumentsPage'));
const ManagerDocumentsPage = lazy(() => import('./pages/documents/ManagerDocumentsPage'));
const ManagerResultsPage = lazy(() => import('./pages/results/ManagerResultsPage'));
const ManagerEscalationsPage = lazy(() => import('./pages/ManagerEscalationsPage'));
const ManagerTeamGapsPage = lazy(() => import('./pages/ManagerTeamGapsPage'));
const ManagerHistoryPage = lazy(() => import('./pages/history/ManagerHistoryPage'));

export const managerModule: RoleModule = {
  role: 'manager',
  dataverseRole: ROLE.Manager,
  label: 'Manager',
  basePath: '/manager',
  navigation: [
    {
      title: 'Mi equipo',
      items: [
        { path: 'panel', label: 'Panel del equipo', icon: House, page: ManagerDashboardPage },
        { path: 'por-validar', label: 'Nuevos por validar', icon: TriangleAlert, page: ManagerPendingValidationPage },
        { path: 'colaboradores', label: 'Colaboradores', icon: Users, page: ManagerTeamPage },
        { path: 'asignar-documentos', label: 'Asignar documentos', icon: FileText, page: ManagerAssignDocumentsPage },
        { path: 'documentos', label: 'Documentos', icon: BookOpen, page: ManagerDocumentsPage },
        { path: 'resultados', label: 'Resultados', icon: SquareCheckBig, page: ManagerResultsPage },
      ],
    },
    {
      title: 'Seguimiento',
      items: [
        { path: 'escalamientos', label: 'Escalamientos', icon: Bell, page: ManagerEscalationsPage },
        { path: 'brechas', label: 'Brechas del equipo', icon: ChartLine, page: ManagerTeamGapsPage },
      ],
    },
    {
      title: 'Mi historial',
      items: [{ path: 'historial', label: 'Historial de inducción', icon: Award, page: ManagerHistoryPage }],
    },
  ],
};
