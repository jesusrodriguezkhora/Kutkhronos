import { useEffect, useRef, useState } from "react";
import { useFrappeGetCall } from "frappe-react-sdk";
import { useDebounced } from "../hooks/useDebounced";
import { ESTILOS } from "../lib/estilos";

// Botón "+ Añadir proyecto" que se convierte en un buscador de proyectos planificables
// (aceptados o en curso, sin acuerdos marco). `excluir` son los que ya están en la tabla.
export default function BuscadorProyecto({ excluir, onElegir }) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState("");
  const [activo, setActivo] = useState(0);
  const contenedor = useRef(null);
  const busqueda = useDebounced(texto, 250);

  const { data, isLoading } = useFrappeGetCall(
    "prototipo.api.planificacion.buscar_proyectos",
    { texto: busqueda },
    abierto ? undefined : null
  );
  const resultados = (data?.message ?? []).filter((p) => !excluir.includes(p.name));

  // Cerrar al hacer clic fuera
  useEffect(() => {
    if (!abierto) return;
    const alPulsar = (e) => {
      if (!contenedor.current?.contains(e.target)) setAbierto(false);
    };
    document.addEventListener("mousedown", alPulsar);
    return () => document.removeEventListener("mousedown", alPulsar);
  }, [abierto]);

  const elegir = (proyecto) => {
    onElegir(proyecto);
    setTexto("");
    setActivo(0);
    setAbierto(false);
  };

  const alTeclear = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActivo((i) => Math.min(i + 1, resultados.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActivo((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && resultados[activo]) {
      e.preventDefault();
      elegir(resultados[activo]);
    } else if (e.key === "Escape") {
      setAbierto(false);
    }
  };

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="rounded-lg border border-dashed border-salvia-900/30 px-3 py-1.5 text-sm font-medium text-salvia-950/70 hover:border-salvia-900 hover:bg-salvia hover:text-salvia-950"
      >
        Añadir proyecto
      </button>
    );
  }

  return (
    <div ref={contenedor} className="relative w-96 max-w-full">
      <input
        type="text"
        role="combobox"
        aria-expanded
        aria-label="Buscar proyecto"
        autoFocus
        className={ESTILOS.claro.campo}
        placeholder="Buscar por código, descripción o cliente"
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          setActivo(0);
        }}
        onKeyDown={alTeclear}
      />
      <ul
        role="listbox"
        className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg bg-salvia-900 py-1 shadow-xl ring-1 ring-white/10"
      >
        {isLoading && <li className="px-3 py-2 text-sm text-white/50">Buscando…</li>}
        {!isLoading && resultados.length === 0 && (
          <li className="px-3 py-2 text-sm text-white/50">Sin proyectos aceptados o en curso que coincidan</li>
        )}
        {resultados.map((p, i) => (
          <li
            key={p.name}
            role="option"
            aria-selected={i === activo}
            onMouseEnter={() => setActivo(i)}
            onMouseDown={(e) => {
              e.preventDefault();
              elegir(p);
            }}
            className={`cursor-pointer px-3 py-2 text-sm ${i === activo ? "bg-white text-salvia-950" : "text-white"}`}
          >
            <span className="font-mono font-semibold">{p.name}</span>
            <span className="block truncate text-xs opacity-60">
              {p.cliente ? `${p.cliente} · ` : ""}
              {p.descripcion || "—"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}