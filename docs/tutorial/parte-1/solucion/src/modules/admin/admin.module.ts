import { ROLE } from '@/shared/constants/choices';
import type { RoleModule } from '@/shared/types/navigation';

export const adminModule: RoleModule = {
  role: 'admin',
  dataverseRole: ROLE.Administrator,
  label: 'Administración',
  basePath: '/admin',
};
