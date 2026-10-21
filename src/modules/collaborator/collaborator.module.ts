import { lazy } from 'react';
import { Award, BookOpen, House, MessageSquare, SquareCheckBig, Zap } from 'lucide-react';
import { ROLE } from '@/shared/constants/choices';
import type { RoleModule } from '@/shared/types/navigation';
// Cada pantalla se descarga recién cuando se abre (code splitting).
const CollaboratorProgressPage = lazy(() => import('./pages/progress/CollaboratorProgressPage'));
const CollaboratorInductionPage = lazy(() => import('./pages/induction/CollaboratorInductionPage'));
const CollaboratorAssessmentsPage = lazy(() => import('./pages/assessments/CollaboratorAssessmentsPage'));
const CollaboratorMicroLearningPage = lazy(() => import('./pages/CollaboratorMicroLearningPage'));
const CollaboratorAssistantPage = lazy(() => import('./pages/CollaboratorAssistantPage'));
const CollaboratorCertificatesPage = lazy(() => import('./pages/certificates/CollaboratorCertificatesPage'));

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
