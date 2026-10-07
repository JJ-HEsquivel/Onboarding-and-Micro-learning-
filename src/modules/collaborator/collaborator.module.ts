import { Award, BookOpen, House, MessageSquare, SquareCheckBig, Zap } from 'lucide-react';
import { ROLE } from '@/shared/constants/choices';
import type { RoleModule } from '@/shared/types/navigation';
import CollaboratorProgressPage from './pages/CollaboratorProgressPage';
import CollaboratorDocumentsPage from './pages/documents/CollaboratorDocumentsPage';
import CollaboratorAssessmentsPage from './pages/CollaboratorAssessmentsPage';
import CollaboratorMicroLearningPage from './pages/CollaboratorMicroLearningPage';
import CollaboratorAssistantPage from './pages/CollaboratorAssistantPage';
import CollaboratorCertificatesPage from './pages/CollaboratorCertificatesPage';

export const collaboratorModule: RoleModule = {
  role: 'collaborator',
  dataverseRole: ROLE.Collaborator,
  label: 'Colaborador',
  basePath: '/colaborador',
  navigation: [
    {
      title: 'Mi inducción',
      items: [
        { path: 'progreso', label: 'Mi progreso', icon: House, page: CollaboratorProgressPage },
        { path: 'documentos', label: 'Mis documentos', icon: BookOpen, page: CollaboratorDocumentsPage, badge: 4 },
        { path: 'evaluaciones', label: 'Mis evaluaciones', icon: SquareCheckBig, page: CollaboratorAssessmentsPage },
      ],
    },
    {
      title: 'Continuo',
      items: [
        { path: 'micro-aprendizaje', label: 'Micro aprendizaje', icon: Zap, page: CollaboratorMicroLearningPage, badge: 3 },
        { path: 'asistente', label: 'Asistente documental', icon: MessageSquare, page: CollaboratorAssistantPage },
        { path: 'constancias', label: 'Mis constancias', icon: Award, page: CollaboratorCertificatesPage },
      ],
    },
  ],
};
