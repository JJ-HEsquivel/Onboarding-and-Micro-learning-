import { ROLE } from '@/shared/constants/choices';
import type { RoleModule } from '@/shared/types/navigation';

export const managerModule: RoleModule = {
  role: 'manager',
  dataverseRole: ROLE.Manager,
  label: 'Manager',
  basePath: '/manager',
};
