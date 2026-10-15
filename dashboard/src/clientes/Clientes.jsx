import { useMemo, useState } from "react";
import { useFrappeGetCall } from "frappe-react-sdk";
import FilaCliente from "./FilaCliente";
import FormularioCliente from "./FormularioCliente";
import ConfirmarEliminacion from "../componentes/ConfirmarEliminacion";
import IconoBuscar from "../componentes/IconoBuscar";
import { GRID } from "./tabla";
import { ESTILOS } from "../lib/estilos";
import { normalizar } from "../lib/texto";

export default function Clientes() {
  const { data, error, isLoading, mutate } = useFrappeGetCall(
    "prototipo.api.clientes.listar_clientes"
  );
  const [busqueda, setBusqueda] = useState("");
  // null: cerrado; "nuevo": alta; un cliente: edición
  const [formulario, setFormulario] = useState(null);
  const [aEliminar, setAEliminar] = useState(null);

  // Si la petición falló, no mostramos datos anteriores
  const clientes = useMemo(() => (error ? [] : data?.message ?? []), [data, error]);

  const filtrados = useMemo(() => {
    const texto = normalizar(busqueda.trim());
    if (!texto) return clientes;
    return clientes.filter((c) =>
      normalizar(`${c.customer_name} ${c.customer_details ?? ""}`).includes(texto)
    );
  }, [clientes, busqueda]);

  return (
    <section>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          {!isLoading && !error && (
            <p className="mt-1 text-sm text-salvia-950/50">
              {clientes.length} {clientes.length === 1 ? "cliente" : "clientes"}
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
              aria-label="Buscar clientes"
              placeholder="Buscar por nombre o descripción"
              className={`${ESTILOS.claro.campo} pl-9`}
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <button
            onClick={() => setFormulario("nuevo")}
            className="rounded-full bg-salvia px-5 py-2.5 text-sm font-semibold text-salvia-950 hover:bg-salvia-900 hover:text-salvia-200"
          >
            Nuevo cliente
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[800px] overflow-hidden rounded-xl border border-salvia-900/10">
          <div
            className={`${GRID} bg-salvia-900 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-salvia-200`}
          >
            <span>Nombre</span>
            <span>Descripción</span>
            <span>Alta</span>
            <span />
          </div>

          {isLoading && (
            <p className="px-4 py-6 text-sm text-salvia-950/50">Cargando clientes…</p>
          )}
          {error && (
            <p className="px-4 py-6 text-sm text-red-600">
              Error al cargar clientes: {error.message}
            </p>
          )}
          {!isLoading && !error && filtrados.length === 0 && (
            <p className="px-4 py-6 text-sm text-salvia-950/50">
              {busqueda ? "Ningún cliente coincide con la búsqueda." : "Todavía no hay clientes."}
            </p>
          )}

          <div className="divide-y divide-salvia-900/10 bg-white">
            {filtrados.map((c) => (
              <FilaCliente
                key={c.name}
                cliente={c}
                onEditar={setFormulario}
                onEliminar={setAEliminar}
              />
            ))}
          </div>
        </div>
      </div>

      {formulario && (
        <FormularioCliente
          cliente={formulario === "nuevo" ? null : formulario}
          clientes={clientes}
          onCerrar={() => setFormulario(null)}
          onGuardado={() => mutate()}
        />
      )}

      {aEliminar && (
        <ConfirmarEliminacion
          titulo="Eliminar cliente"
          metodo="prototipo.api.clientes.eliminar_cliente"
          argumentos={{ cliente: aEliminar.name }}
          onCerrar={() => setAEliminar(null)}
          onEliminado={() => mutate()}
        >
          Se borrará de la base de datos el cliente{" "}
          <strong className="text-salvia-950">{aEliminar.customer_name}</strong>.
        </ConfirmarEliminacion>
      )}
    </section>
  );
}
