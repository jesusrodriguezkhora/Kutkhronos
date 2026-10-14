import { useState } from "react";
import { useFrappeGetCall } from "frappe-react-sdk";
import FilaProyecto from "./FilaProyecto";
import Filtros from "./Filtros";
import FichaProyecto from "./FichaProyecto";
import { GRID } from "./tabla";
import { useDebounced } from "../hooks/useDebounced";

const FILTROS_VACIOS = {
  cliente: "",
  tipo: "",
  via: "",
  estado: "",
  importe_min: "",
  importe_max: "",
};

// Quita los filtros vacíos para no enviarlos al servidor
function soloActivos(filtros) {
  return Object.fromEntries(
    Object.entries(filtros).filter(([, valor]) => valor !== "" && valor != null)
  );
}

function IconoFiltro() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
      <path
        fillRule="evenodd"
        d="M2.628 1.601C5.028 1.206 7.49 1 10 1s4.973.206 7.372.601a.75.75 0 01.628.74v2.288a2.25 2.25 0 01-.659 1.59l-4.682 4.683a2.25 2.25 0 00-.659 1.59v3.037c0 .684-.31 1.33-.844 1.757l-1.937 1.55A.75.75 0 018 18.25v-5.757a2.25 2.25 0 00-.659-1.591L2.659 6.22A2.25 2.25 0 012 4.629V2.34a.75.75 0 01.628-.74z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default function Proyectos() {
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [desplegados, setDesplegados] = useState(() => new Set());

  // Ficha abierta: null (ninguna), {} (nuevo), { proyecto } (detalle) o { acuerdoMarco } (nuevo contrato basado)
  const [ficha, setFicha] = useState(null);

  // Los filtros llegan al servidor solo cuando el usuario deja de modificarlos
  const filtrosAplicados = soloActivos(useDebounced(filtros, 400));
  const hayFiltros = Object.keys(filtrosAplicados).length > 0;

  const { data, error, isLoading, isValidating, mutate } = useFrappeGetCall(
    "prototipo.api.proyectos.obtener_proyectos",
    hayFiltros ? { filtros: JSON.stringify(filtrosAplicados) } : undefined,
    undefined,
    { keepPreviousData: true }
  );

  const cambiarFiltro = (campo, valor) => {
    setFiltros((anteriores) => ({ ...anteriores, [campo]: valor }));
    setDesplegados(new Set()); // al cambiar filtros, todo vuelve a plegarse
  };

  const limpiarFiltros = () => {
    setFiltros(FILTROS_VACIOS);
    setDesplegados(new Set());
  };

  const alternar = (codigo) => {
    setDesplegados((anterior) => {
      const nuevo = new Set(anterior);
      if (nuevo.has(codigo)) nuevo.delete(codigo);
      else nuevo.add(codigo);
      return nuevo;
    });
  };

  const proyectos = error ? [] : data?.message ?? [];
  const numFiltros = Object.keys(soloActivos(filtros)).length;

  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Proyectos</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setFicha({})}
            className="rounded-full bg-salvia px-5 py-2.5 text-sm font-semibold text-salvia-950 hover:bg-salvia-900 hover:text-salvia-200"
          >
            Nuevo proyecto
          </button>
          <button
            onClick={() => setPanelAbierto((abierto) => !abierto)}
            aria-expanded={panelAbierto}
            title="Filtros"
            className={`relative grid h-10 w-10 place-items-center rounded-lg border ${
              panelAbierto || numFiltros > 0
                ? "border-salvia-900 bg-salvia-900 text-salvia-200"
                : "border-salvia-900/15 hover:bg-salvia"
            }`}
          >
            <IconoFiltro />
            {numFiltros > 0 && (
              <span className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-salvia text-xs font-bold text-salvia-950 ring-2 ring-white">
                {numFiltros}
              </span>
            )}
          </button>
        </div>
      </div>

      {panelAbierto && (
        <Filtros filtros={filtros} onCambiar={cambiarFiltro} onLimpiar={limpiarFiltros} />
      )}

      <div className="overflow-x-auto">
        <div
          className={`min-w-[960px] overflow-hidden rounded-xl border border-salvia-900/10 transition-opacity ${
            isValidating && !isLoading ? "opacity-60" : ""
          }`}
        >
          <div
            className={`${GRID} bg-salvia-900 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-salvia-200`}
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
            <p className="px-4 py-6 text-sm text-salvia-950/50">Cargando proyectos…</p>
          )}
          {error && (
            <p className="px-4 py-6 text-sm text-red-600">
              Error al cargar proyectos: {error.message}
            </p>
          )}
          {!isLoading && !error && proyectos.length === 0 && (
            <p className="px-4 py-6 text-sm text-salvia-950/50">
              {hayFiltros
                ? "Ningún proyecto coincide con los filtros."
                : "No hay proyectos."}
            </p>
          )}

          <div className="divide-y divide-salvia-900/10 bg-white">
            {proyectos.map((p) => (
              <FilaProyecto
                key={p.name}
                proyecto={p}
                desplegado={desplegados.has(p.name)}
                onAlternar={() => alternar(p.name)}
                onVerDetalle={(proyecto) => setFicha({ proyecto })}
                onAnadirContratoBasado={(acuerdo) => setFicha({ acuerdoMarco: acuerdo })}
              />
            ))}
          </div>
        </div>
      </div>

      {ficha && (
        <FichaProyecto
          proyecto={ficha.proyecto}
          acuerdoMarco={ficha.acuerdoMarco}
          onCerrar={() => setFicha(null)}
          onCreado={() => {
            setFicha(null);
            mutate();
          }}
          onActualizado={() => mutate()}
        />
      )}
    </section>
  );
}