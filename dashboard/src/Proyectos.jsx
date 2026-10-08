import { useState } from "react";
import { useFrappeGetCall } from "frappe-react-sdk";
import FilaProyecto from "./FilaProyecto";
import { GRID } from "./tabla";

export default function Proyectos() {
  const { data, error, isLoading } = useFrappeGetCall(
    "prototipo.api.obtener_proyectos"
  );

  // Códigos de los acuerdos marco desplegados. Vacío al inicio: todo plegado.
  const [desplegados, setDesplegados] = useState(() => new Set());

  const alternar = (codigo) => {
    setDesplegados((anterior) => {
      const nuevo = new Set(anterior); // copia: React necesita un objeto nuevo
      if (nuevo.has(codigo)) nuevo.delete(codigo);
      else nuevo.add(codigo);
      return nuevo;
    });
  };

  const proyectos = data?.message ?? [];

  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Proyectos</h1>
        <button className="rounded-full bg-[#fadc6a] px-5 py-2.5 text-sm font-semibold text-black hover:bg-black hover:text-[#fadc6a]">
          + Nuevo proyecto
        </button>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[960px] overflow-hidden rounded-xl border border-black/10">
          <div
            className={`${GRID} bg-black px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#fadc6a]`}
          >
            <span />
            <span>Código</span>
            <span>Cliente</span>
            <span>Tipo</span>
            <span>Vía</span>
            <span className="text-right">Importe</span>
            <span>Estado</span>
            <span />
          </div>

          {isLoading && (
            <p className="px-4 py-6 text-sm text-black/50">Cargando proyectos…</p>
          )}
          {error && (
            <p className="px-4 py-6 text-sm text-red-600">
              Error al cargar proyectos: {error.message}
            </p>
          )}
          {!isLoading && !error && proyectos.length === 0 && (
            <p className="px-4 py-6 text-sm text-black/50">No hay proyectos.</p>
          )}

          <div className="divide-y divide-black/10 bg-white">
            {proyectos.map((p) => (
              <FilaProyecto
                key={p.name}
                proyecto={p}
                desplegado={desplegados.has(p.name)}
                onAlternar={() => alternar(p.name)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}