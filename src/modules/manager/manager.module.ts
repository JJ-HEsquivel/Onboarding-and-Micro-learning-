import { Bell, ChartLine, FileText, House, SquareCheckBig, TriangleAlert, Users } from 'lucide-react';
import { ROLE } from '@/shared/constants/choices';
import type { RoleModule } from '@/shared/types/navigation';
import ManagerDashboardPage from './pages/ManagerDashboardPage';
import ManagerPendingValidationPage from './pages/pending-validation/ManagerPendingValidationPage';
import ManagerCollaboratorsPage from './pages/ManagerCollaboratorsPage';
import ManagerAssignDocumentsPage from './pages/ManagerAssignDocumentsPage';
import ManagerResultsPage from './pages/ManagerResultsPage';
import ManagerEscalationsPage from './pages/ManagerEscalationsPage';
import ManagerTeamGapsPage from './pages/ManagerTeamGapsPage';

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
        { path: 'colaboradores', label: 'Colaboradores', icon: Users, page: ManagerCollaboratorsPage },
        { path: 'asignar-documentos', label: 'Asignar documentos', icon: FileText, page: ManagerAssignDocumentsPage },
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
  ],
};
