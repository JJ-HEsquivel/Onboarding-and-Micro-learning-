import { RouterProvider } from "react-router-dom";
import { router } from "./core/routes/routes";

function App() {
  return (
    // Proveemos el enrutador modular a todo el ecosistema de la app
    <RouterProvider router={router} />
  );
}

export default App;

