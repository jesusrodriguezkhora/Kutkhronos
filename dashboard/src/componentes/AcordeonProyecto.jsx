import { useId, useState } from "react";
import { IconoChevronAbajo } from "./Iconos";

// Desplegable de un proyecto. La cabecera muestra el código y la descripción del proyecto;
// el cuerpo (children) es libre: ahí irán la información, los indicadores y las acciones de cada
// proyecto. Sin children muestra un texto por defecto.
export default function AcordeonProyecto({ proyecto, abiertoInicial = false, children }) {
  const [abierto, setAbierto] = useState(abiertoInicial);
  const idCuerpo = useId();

  return (
    <div className="overflow-hidden rounded-xl border border-salvia-900/10 bg-white shadow-sm">
      <h3>
        <button
          type="button"
          onClick={() => setAbierto((a) => !a)}
          aria-expanded={abierto}
          aria-controls={idCuerpo}
          className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-salvia-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-salvia"
        >
          <span className="shrink-0 rounded-md bg-salvia-100 px-2 py-0.5 font-mono text-xs font-semibold text-salvia-800">
            {proyecto.name}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-salvia-950">
            {proyecto.descripcion || "Sin descripción"}
          </span>
          <IconoChevronAbajo
            className={`h-4 w-4 shrink-0 text-salvia-950/50 transition-transform ${abierto ? "rotate-180" : ""}`}
          />
        </button>
      </h3>

      {abierto && (
        <div id={idCuerpo} role="region" className="border-t border-salvia-900/10 bg-salvia-50/50 px-5 py-4">
          {children ?? (
            <p className="text-sm text-salvia-950/50">Todavía no hay información para este proyecto.</p>
          )}
        </div>
      )}
    </div>
  );
}
