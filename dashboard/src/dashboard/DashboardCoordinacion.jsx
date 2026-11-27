import { useFrappeGetCall } from "frappe-react-sdk";
import AcordeonProyecto from "../componentes/AcordeonProyecto";
import EstadoVacio from "../componentes/EstadoVacio";
import TarjetaKPI, { RejillaKPI } from "../componentes/TarjetaKPI";
import { IconoCarpeta } from "../componentes/Iconos";
import { mensajeDeError } from "../lib/errores";
import PlantillaDashboard, { BloqueDashboard } from "./PlantillaDashboard";

// KPIs del bloque superior, en orden. `clave` es la del diccionario `kpis` que devuelve
// prototipo.api.dashboard.obtener_dashboard_coordinacion: para un KPI nuevo, calcularlo allí y
// añadirlo aquí.
const KPIS = [
  {
    clave: "proyectos_asignados",
    etiqueta: "Proyectos asignados",
    icono: IconoCarpeta,
    detalle: "Proyectos de los que eres responsable",
  },
];

// Contenido del desplegable de cada proyecto. Por ahora vacío: aquí irán la información, los
// indicadores y las funcionalidades específicas del proyecto.
function ContenidoProyecto() {
  return <p className="text-sm text-salvia-950/50">Próximamente: información e indicadores del proyecto.</p>;
}

export default function DashboardCoordinacion() {
  const { data, error, isLoading } = useFrappeGetCall("prototipo.api.dashboard.obtener_dashboard_coordinacion");
  const datos = data?.message;
  const proyectos = datos?.proyectos ?? [];

  return (
    <PlantillaDashboard>
      {error && <p className="text-sm text-red-600">Error al cargar el dashboard: {mensajeDeError(error)}</p>}

      <BloqueDashboard titulo="Indicadores">
        <RejillaKPI>
          {KPIS.map((k) => (
            <TarjetaKPI
              key={k.clave}
              etiqueta={k.etiqueta}
              icono={k.icono}
              detalle={k.detalle}
              cargando={isLoading}
              valor={k.formato ? k.formato(datos?.kpis?.[k.clave]) : datos?.kpis?.[k.clave] ?? "—"}
            />
          ))}
        </RejillaKPI>
      </BloqueDashboard>

      <BloqueDashboard titulo="Mis proyectos" subtitulo="Proyectos en los que figuras como responsable">
        {isLoading ? (
          <p className="text-sm text-salvia-950/50">Cargando proyectos…</p>
        ) : proyectos.length === 0 ? (
          !error && (
            <EstadoVacio
              icono={IconoCarpeta}
              titulo="No tienes proyectos asignados"
              texto="Cuando seas responsable de algún proyecto, aparecerá aquí."
            />
          )
        ) : (
          <div className="space-y-3">
            {proyectos.map((p) => (
              <AcordeonProyecto key={p.name} proyecto={p}>
                <ContenidoProyecto proyecto={p} />
              </AcordeonProyecto>
            ))}
          </div>
        )}
      </BloqueDashboard>
    </PlantillaDashboard>
  );
}
