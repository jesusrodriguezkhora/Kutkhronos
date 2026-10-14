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
    <span className="inline-block rounded-full bg-salvia-900 px-2.5 py-0.5 text-xs font-medium text-salvia-200">
      Coordinador
    </span>
  ) : (
    <span className="inline-block rounded-full border border-salvia-900/30 px-2.5 py-0.5 text-xs font-medium">
      Empleado
    </span>
  );
}

function IconoPapelera() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path
        fillRule="evenodd"
        d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default function FilaEmpleado({ empleado, puedeEliminar, onEliminar }) {
  const activo = Boolean(empleado.enabled);

  return (
     <div
        className={`${GRID} px-4 py-3 text-sm transition-colors hover:bg-salvia/15 ${
          activo ? "" : "opacity-50"
        }`}
      >
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-salvia text-xs font-bold text-salvia-950">
          {iniciales(empleado.full_name)}
        </span>
        <span className="font-medium">{empleado.full_name}</span>
      </div>

      <div className="truncate text-salvia-950/70">{empleado.email}</div>
      <div className="tabular-nums text-salvia-950/70">{empleado.mobile_no || "—"}</div>

      <div>
        <Rol esCoordinador={empleado.es_coordinador} />
      </div>

      <div className={activo ? "text-salvia-950" : "text-salvia-950/50"}>
        {activo ? "Activo" : "Desactivado"}
      </div>

      <div className="tabular-nums text-salvia-950/70">
        {formatearFecha(empleado.creation?.slice(0, 10))}
      </div>

      <div className="flex justify-end">
        {puedeEliminar && (
          <button
            type="button"
            onClick={onEliminar}
            aria-label={`Eliminar a ${empleado.full_name}`}
            title="Eliminar"
            className="grid h-8 w-8 place-items-center rounded-lg text-salvia-950/50 hover:bg-red-50 hover:text-red-600"
          >
            <IconoPapelera />
          </button>
        )}
      </div>
    </div>
  );
}