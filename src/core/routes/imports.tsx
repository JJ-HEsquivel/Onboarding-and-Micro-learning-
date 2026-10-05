import { lazy } from "react";

// Importaciones perezosas apuntando a las ubicaciones de tus contenedores
export const AdminContainer = lazy(
  () => import("../../modules/admin/containers/AdminContainer")
);


