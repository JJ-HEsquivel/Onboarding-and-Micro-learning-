import {
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
import type { RoleModule } from '@/shared/types/navigation';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminCollaboratorsPage from './pages/collaborators/AdminCollaboratorsPage';
import AdminDocumentsPage from './pages/AdminDocumentsPage';
import AdminLearningPathsPage from './pages/AdminLearningPathsPage';
import AdminAssessmentsPage from './pages/AdminAssessmentsPage';
import AdminMicroLearningPage from './pages/AdminMicroLearningPage';
import AdminAnalyticsPage from './pages/AdminAnalyticsPage';
import AdminAutomationsPage from './pages/AdminAutomationsPage';
import AdminEvidencePage from './pages/AdminEvidencePage';
import AdminSettingsPage from './pages/AdminSettingsPage';

export const adminModule: RoleModule = {
  role: 'admin',
  label: 'Administración',
  basePath: '/admin',
  // TODO: reemplazar por el usuario autenticado (Dataverse / Office 365).
  user: { fullName: 'Marcelo Antezana', jobTitle: 'Quality Control Processes Lead', initials: 'MA' },
  navigation: [
    {
      title: 'Operación',
      items: [
        { path: 'panel', label: 'Panel general', icon: House, page: AdminDashboardPage },
        { path: 'colaboradores', label: 'Colaboradores', icon: Users, page: AdminCollaboratorsPage, badge: 3 },
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
