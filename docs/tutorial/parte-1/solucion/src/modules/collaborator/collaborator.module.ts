import { ROLE } from '@/shared/constants/choices';
import type { RoleModule } from '@/shared/types/navigation';

export const collaboratorModule: RoleModule = {
  role: 'collaborator',
  dataverseRole: ROLE.Collaborator,
  label: 'Colaborador',
  basePath: '/colaborador',
};
