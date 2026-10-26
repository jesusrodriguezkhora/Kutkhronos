import { useFrappeGetCall } from "frappe-react-sdk";
import TablaSupervision from "./TablaSupervision";
import { mensajeDeError } from "../lib/errores";

// Leyenda de colores bajo la tabla
function Leyenda({ terminada }) {
  const muestra = (color, texto) => (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-3 w-3 rounded-sm ${color}`} aria-hidden="true" />
      {texto}
    </span>
  );
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-salvia-900/10 pt-4 text-xs text-salvia-950/60">
      <span className="font-semibold text-salvia-950/70">Horas cargadas / planificadas</span>
      {muestra("bg-amber-100 ring-1 ring-amber-300", "Desviación de más del 15 %")}
      {muestra("bg-red-100 ring-1 ring-red-300", "Más del 30 %")}
      {muestra("bg-sky-100 ring-1 ring-sky-300", "Sin planificar")}
      {!terminada && (
        <span>
          · Los colores aparecen cuando se cierra la carga de horas de la semana (el martes siguiente a las 00:00).
        </span>
      )}
    </div>
  );
}

// Modo supervisión de una semana: horas reales frente a planificadas (solo lectura)
export default function Supervision({ lunes }) {
  const { data, error, isLoading } = useFrappeGetCall(
    "prototipo.api.supervision.supervision_semana",
    { lunes },
    lunes ? undefined : null
  );
  const info = data?.message;

  if (!lunes) return null;
  if (isLoading) return <p className="text-sm text-salvia-950/50">Cargando supervisión…</p>;
  if (error) return <p className="text-sm text-red-600">{mensajeDeError(error)}</p>;
  if (!info) return null;

  return (
    <div className="space-y-4">
      <TablaSupervision info={info} />
      <Leyenda terminada={info.semana.terminada} />
    </div>
  );
}