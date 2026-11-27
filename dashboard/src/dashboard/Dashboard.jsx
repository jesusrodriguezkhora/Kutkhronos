import { usePerfil } from "../hooks/usePerfil";
import DashboardCEO from "./DashboardCEO";
import DashboardAdministracion from "./DashboardAdministracion";
import DashboardCoordinacion from "./DashboardCoordinacion";
import DashboardGeneral from "./DashboardGeneral";
import { PERFIL_ADMINISTRACION, PERFIL_CEO, PERFIL_COORDINACION, PERFIL_GENERAL } from "./perfiles";

// Dashboard de cada perfil. Qué perfil tiene el usuario lo decide el backend (mi_perfil.dashboard).
const DASHBOARDS = {
  [PERFIL_CEO]: DashboardCEO,
  [PERFIL_ADMINISTRACION]: DashboardAdministracion,
  [PERFIL_COORDINACION]: DashboardCoordinacion,
  [PERFIL_GENERAL]: DashboardGeneral,
};

// Página "Dashboard": elige automáticamente el dashboard del usuario autenticado
export default function Dashboard() {
  const perfil = usePerfil();
  if (!perfil) return null;
  const DashboardDelPerfil = DASHBOARDS[perfil.dashboard] ?? DashboardGeneral;
  return <DashboardDelPerfil />;
}
