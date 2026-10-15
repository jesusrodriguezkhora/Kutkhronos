import BotonesAccion from "../componentes/BotonesAccion";
import { GRID, GRID_LABORAL } from "./tabla";
import { formatearCosteHora, formatearFecha } from "../lib/formato";

function iniciales(nombre) {
  return (nombre || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0].toUpperCase())
    .join("");
}

function Rol({ rol }) {
  return rol === "Empleado" ? (
    <span className="inline-block rounded-full border border-salvia-900/30 px-2.5 py-0.5 text-xs font-medium">
      Empleado
    </span>
  ) : (
    <span className="inline-block rounded-full bg-salvia-900 px-2.5 py-0.5 text-xs font-medium text-salvia-200">
      {rol}
    </span>
  );
}

export default function FilaEmpleado({ empleado, veLaborales, onEditar, onEliminar }) {
  const activo = Boolean(empleado.enabled);

  return (
    <div
      className={`${veLaborales ? GRID_LABORAL : GRID} px-4 py-3 text-sm transition-colors hover:bg-salvia/15 ${
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
        <Rol rol={empleado.rol} />
      </div>

      {veLaborales && (
        <>
          <div className="text-salvia-950/70">{empleado.posicion || "—"}</div>
          <div className="tabular-nums text-salvia-950/70">
            {formatearCosteHora(empleado.coste_hora)}
          </div>
        </>
      )}

      <div className={activo ? "text-salvia-950" : "text-salvia-950/50"}>
        {activo ? "Activo" : "Desactivado"}
      </div>

      <div className="tabular-nums text-salvia-950/70">
        {formatearFecha(empleado.creation?.slice(0, 10))}
      </div>

      {/* Sin botones en la cuenta propia ni en las de dirección (si no eres de dirección) */}
      <div>
        {empleado.editable && (
          <BotonesAccion
            onEditar={() => onEditar(empleado)}
            onEliminar={() => onEliminar(empleado)}
          />
        )}
      </div>
    </div>
  );
}