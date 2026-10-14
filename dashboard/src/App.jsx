import { FrappeProvider } from "frappe-react-sdk";
import { BrowserRouter } from "react-router-dom";
import Inicio from "./Inicio";

// En desarrollo, Vite sirve la SPA en la raíz; en producción, Frappe la sirve en /dashboard
const RUTA_BASE = import.meta.env.DEV ? "/" : "/dashboard";

export default function App() {
  return (
    <FrappeProvider enableSocket={false}>
      <BrowserRouter basename={RUTA_BASE}>
        <Inicio />
      </BrowserRouter>
    </FrappeProvider>
  );
}git