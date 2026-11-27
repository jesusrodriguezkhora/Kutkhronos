import Panel from "../panel/Panel";
import PlantillaDashboard from "./PlantillaDashboard";

// Dashboard del CEO: el panel de siempre (cartera viva y pipeline), con la estructura común
export default function DashboardCEO() {
  return (
    <PlantillaDashboard>
      <Panel />
    </PlantillaDashboard>
  );
}
