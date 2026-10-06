import type { RoleModule } from '@/shared/types/navigation';
import { adminModule } from './admin/admin.module';
import { managerModule } from './manager/manager.module';
import { collaboratorModule } from './collaborator/collaborator.module';

/** Todos los roles registrados. Para agregar un rol nuevo, crear su módulo y añadirlo aquí. */
export const roleModules: RoleModule[] = [adminModule, managerModule, collaboratorModule];
