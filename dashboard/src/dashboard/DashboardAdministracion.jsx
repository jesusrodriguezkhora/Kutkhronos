import EstadoVacio from "../componentes/EstadoVacio";
import PlantillaDashboard from "./PlantillaDashboard";

// Dashboard de Administración. Pendiente de definir su contenido.
export default function DashboardAdministracion() {
  return (
    <PlantillaDashboard>
      <EstadoVacio
        titulo="Dashboard de Administración"
        texto="Aún no hay indicadores para este perfil. Aparecerán aquí cuando se definan."
      />
    </PlantillaDashboard>
  );
}
