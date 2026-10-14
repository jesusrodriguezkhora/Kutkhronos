import { useMemo, useState } from "react";
import { useFrappeGetCall } from "frappe-react-sdk";
import FilaEmpleado from "./FilaEmpleado";
import AltaEmpleado from "./AltaEmpleado";
import { GRID } from "./tabla";
import { ESTILOS } from "../lib/estilos";

// Minúsculas y sin tildes, para que "garcia" encuentre "García"
function normalizar(texto) {
  return (texto || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function IconoBuscar() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path
        fillRule="evenodd"
        d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default function Empleados() {
  const { data, error, isLoading, mutate } = useFrappeGetCall(
    "prototipo.api.empleados.listar_empleados"
  );
  const [busqueda, setBusqueda] = useState("");
  const [altaAbierta, setAltaAbierta] = useState(false);

  // Si la petición falló, no mostramos datos anteriores
  const empleados = error ? [] : data?.message ?? [];

  const filtrados = useMemo(() => {
    const texto = normalizar(busqueda.trim());
    if (!texto) return empleados;
    return empleados.filter((e) =>
      normalizar(`${e.full_name} ${e.email} ${e.mobile_no ?? ""}`).includes(texto)
    );
  }, [empleados, busqueda]);

  return (
    <section>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Empleados</h1>
          {!isLoading && !error && (
            <p className="mt-1 text-sm text-salvia-950/50">
              {empleados.length} {empleados.length === 1 ? "cuenta" : "cuentas"}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-72">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-salvia-950/40">
              <IconoBuscar />
            </span>
            <input
              type="search"
              aria-label="Buscar empleados"
              placeholder="Buscar por nombre, correo o teléfono"
              className={`${ESTILOS.claro.campo} pl-9`}
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <button
            onClick={() => setAltaAbierta(true)}
            className="rounded-full bg-salvia px-5 py-2.5 text-sm font-semibold text-salvia-950 hover:bg-salvia-900 hover:text-salvia-200"
          >
            Nuevo empleado
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[900px] overflow-hidden rounded-xl border border-salvia-900/10">
          <div
            className={`${GRID} bg-salvia-900 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-salvia-200`}
          >
            <span>Nombre</span>
            <span>Correo</span>
            <span>Teléfono</span>
            <span>Rol</span>
            <span>Estado</span>
            <span>Alta</span>
          </div>

          {isLoading && (
            <p className="px-4 py-6 text-sm text-salvia-950/50">Cargando empleados…</p>
          )}
          {error && (
            <p className="px-4 py-6 text-sm text-red-600">
              Error al cargar empleados: {error.message}
            </p>
          )}
          {!isLoading && !error && filtrados.length === 0 && (
            <p className="px-4 py-6 text-sm text-salvia-950/50">
              {busqueda ? "Ningún empleado coincide con la búsqueda." : "Todavía no hay empleados."}
            </p>
          )}

          <div className="divide-y divide-salvia-900/10 bg-white">
            {filtrados.map((e) => (
              <FilaEmpleado key={e.name} empleado={e} />
            ))}
          </div>
        </div>
      </div>

      {altaAbierta && (
        <AltaEmpleado onCerrar={() => setAltaAbierta(false)} onCreado={() => mutate()} />
      )}
    </section>
  );
}