import { Award, BookOpen, House, MessageSquare, SquareCheckBig, Zap } from 'lucide-react';
import { ROLE } from '@/shared/constants/choices';
import type { RoleModule } from '@/shared/types/navigation';
import CollaboratorProgressPage from './pages/progress/CollaboratorProgressPage';
import CollaboratorInductionPage from './pages/induction/CollaboratorInductionPage';
import CollaboratorAssessmentsPage from './pages/assessments/CollaboratorAssessmentsPage';
import CollaboratorMicroLearningPage from './pages/CollaboratorMicroLearningPage';
import CollaboratorAssistantPage from './pages/CollaboratorAssistantPage';
import CollaboratorCertificatesPage from './pages/certificates/CollaboratorCertificatesPage';

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
        { path: 'induccion', label: 'Inducción', icon: BookOpen, page: CollaboratorInductionPage },
        { path: 'evaluaciones', label: 'Mis evaluaciones', icon: SquareCheckBig, page: CollaboratorAssessmentsPage },
      ],
    },
    {
      title: 'Continuo',
      items: [
        { path: 'micro-aprendizaje', label: 'Micro aprendizaje', icon: Zap, page: CollaboratorMicroLearningPage },
        { path: 'asistente', label: 'Asistente documental', icon: MessageSquare, page: CollaboratorAssistantPage },
        { path: 'constancias', label: 'Mis constancias', icon: Award, page: CollaboratorCertificatesPage },
      ],
    },
  ],
};
