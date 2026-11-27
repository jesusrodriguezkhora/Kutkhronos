import EstadoVacio from "../componentes/EstadoVacio";
import PlantillaDashboard from "./PlantillaDashboard";

// Dashboard de los usuarios que no son CEO, Administración ni Coordinación (empleados).
// Pendiente de definir su contenido.
export default function DashboardGeneral() {
  return (
    <PlantillaDashboard>
      <EstadoVacio
        titulo="Tu dashboard"
        texto="Aún no hay información para tu perfil. Mientras tanto, puedes cargar tus horas desde Planificación › Carga de horas."
      />
    </PlantillaDashboard>
  );
}
