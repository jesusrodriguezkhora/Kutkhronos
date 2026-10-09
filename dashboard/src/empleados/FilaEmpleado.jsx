import { GRID } from "./tabla";
import { formatearFecha } from "../lib/formato";

function iniciales(nombre) {
  return (nombre || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0].toUpperCase())
    .join("");
}

function Rol({ esCoordinador }) {
  return esCoordinador ? (
    <span className="inline-block rounded-full bg-black px-2.5 py-0.5 text-xs font-medium text-[#fadc6a]">
      Coordinador
    </span>
  ) : (
    <span className="inline-block rounded-full border border-black/30 px-2.5 py-0.5 text-xs font-medium">
      Empleado
    </span>
  );
}

export default function FilaEmpleado({ empleado }) {
  const activo = Boolean(empleado.enabled);

  return (
    <div className={`${GRID} px-4 py-3 text-sm ${activo ? "" : "opacity-50"}`}>
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#fadc6a] text-xs font-bold text-black">
          {iniciales(empleado.full_name)}
        </span>
        <span className="font-medium">{empleado.full_name}</span>
      </div>

      <div className="truncate text-black/70">{empleado.email}</div>
      <div className="tabular-nums text-black/70">{empleado.mobile_no || "—"}</div>

      <div>
        <Rol esCoordinador={empleado.es_coordinador} />
      </div>

      <div className={activo ? "text-black" : "text-black/50"}>
        {activo ? "Activo" : "Desactivado"}
      </div>

      <div className="tabular-nums text-black/70">
        {formatearFecha(empleado.creation?.slice(0, 10))}
      </div>
    </div>
  );
}