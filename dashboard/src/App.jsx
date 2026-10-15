import { FrappeProvider } from "frappe-react-sdk";
import { BrowserRouter } from "react-router-dom";
import Inicio from "./Inicio";

// En desarrollo, Vite sirve la SPA en la raíz; en producción, Frappe la sirve en /dashboard
const RUTA_BASE = import.meta.env.DEV ? "/" : "/dashboard";

// Frappe puede servir esta página fuera de /dashboard (por ejemplo en "/" como página de inicio
// por rol) y ahí el router no encuentra ninguna ruta y la página sale en blanco
if (!window.location.pathname.startsWith(RUTA_BASE)) {
  window.location.replace(RUTA_BASE);
}

export default function App() {
  return (
    <FrappeProvider enableSocket={false}>
      <BrowserRouter basename={RUTA_BASE}>
        <Inicio />
      </BrowserRouter>
    </FrappeProvider>
  );
}