import { createBrowserRouter } from "react-router-dom";
import { 
  AdminContainer
} from "./imports";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <div>Hello World! (Página de Inicio General)</div>,
    children: [
      {
        index: true,
        element: <div>Bienvenido al Sistema Centralizado</div>,
      },
      {
        path: "admin",
        element: <AdminContainer />,
        children: [
          {
            index: true,
            element: <div>Panel de Control - Administrador</div>,
          }
        ]
      }
    ]
  }
]);
