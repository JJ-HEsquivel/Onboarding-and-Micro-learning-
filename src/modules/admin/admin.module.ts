import { lazy } from 'react';
import {
  Award,
  Bell,
  ChartLine,
  FileText,
  House,
  Route,
  Settings,
  ShieldCheck,
  SquareCheckBig,
  Users,
  Zap,
} from 'lucide-react';
import { ROLE } from '@/shared/constants/choices';
import type { RoleModule } from '@/shared/types/navigation';
// Cada pantalla se descarga recién cuando se abre (code splitting).
const AdminDashboardPage = lazy(() => import('./pages/dashboard/AdminDashboardPage'));
const AdminCollaboratorsPage = lazy(() => import('./pages/collaborators/AdminCollaboratorsPage'));
const AdminManagersPage = lazy(() => import('./pages/managers/AdminManagersPage'));
const AdminDocumentsPage = lazy(() => import('./pages/documents/AdminDocumentsPage'));
const AdminLearningPathsPage = lazy(() => import('./pages/learning-paths/AdminLearningPathsPage'));
const AdminAssessmentsPage = lazy(() => import('./pages/assessments/AdminAssessmentsPage'));
const AdminMicroLearningPage = lazy(() => import('./pages/AdminMicroLearningPage'));
const AdminAnalyticsPage = lazy(() => import('./pages/AdminAnalyticsPage'));
const AdminAutomationsPage = lazy(() => import('./pages/AdminAutomationsPage'));
const AdminEvidencePage = lazy(() => import('./pages/AdminEvidencePage'));
const AdminSettingsPage = lazy(() => import('./pages/AdminSettingsPage'));

export const adminModule: RoleModule = {
  role: 'admin',
  dataverseRole: ROLE.Administrator,
  label: 'Administración',
  basePath: '/admin',
  navigation: [
    {
      title: 'Operación',
      items: [
        { path: 'panel', label: 'Panel general', icon: House, page: AdminDashboardPage },
        { path: 'colaboradores', label: 'Colaboradores', icon: Users, page: AdminCollaboratorsPage },
        { path: 'managers', label: 'Managers y ascensos', icon: Award, page: AdminManagersPage },
        { path: 'documentos', label: 'Documentos', icon: FileText, page: AdminDocumentsPage },
        { path: 'rutas', label: 'Rutas de aprendizaje', icon: Route, page: AdminLearningPathsPage },
      ],
    },
    {
      title: 'Conocimiento',
      items: [
        { path: 'evaluaciones', label: 'Evaluaciones', icon: SquareCheckBig, page: AdminAssessmentsPage },
        { path: 'micro-aprendizaje', label: 'Micro aprendizaje', icon: Zap, page: AdminMicroLearningPage },
        { path: 'analitica', label: 'Analítica y brechas', icon: ChartLine, page: AdminAnalyticsPage },
      ],
    },
    {
      title: 'Control',
      items: [
        { path: 'automatizaciones', label: 'Automatizaciones', icon: Bell, page: AdminAutomationsPage },
        { path: 'evidencias', label: 'Evidencias', icon: ShieldCheck, page: AdminEvidencePage },
        { path: 'configuracion', label: 'Configuración', icon: Settings, page: AdminSettingsPage },
      ],
    },
  ],
};
