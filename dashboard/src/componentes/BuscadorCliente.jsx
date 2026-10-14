import { useEffect, useRef, useState } from "react";
import { useFrappeGetCall } from "frappe-react-sdk";
import { useDebounced } from "../hooks/useDebounced";

export default function BuscadorCliente({
  valor,
  onChange,
  clases,
  etiqueta = "Cliente",
  placeholder = "Todos",
}) {
  const [texto, setTexto] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const contenedor = useRef(null);
  const busqueda = useDebounced(texto, 250);

  // Misma búsqueda que usan los campos Link del Desk. Solo se lanza con la lista abierta.
  const { data, isLoading } = useFrappeGetCall(
    "frappe.desk.search.search_link",
    { doctype: "Customer", txt: busqueda, page_length: 10 },
    abierto ? undefined : null
  );

  const resultados = (data?.message ?? []).map((r) => ({
    valor: r.value ?? r.name,
    detalle: r.description,
  }));

  // Cerrar la lista al hacer clic fuera del componente
  useEffect(() => {
    if (!abierto) return;
    const alPulsar = (e) => {
      if (!contenedor.current?.contains(e.target)) setAbierto(false);
    };
    document.addEventListener("mousedown", alPulsar);
    return () => document.removeEventListener("mousedown", alPulsar);
  }, [abierto]);

  const abrir = () => {
    setTexto("");
    setActivo(0);
    setAbierto(true);
  };

  const elegir = (cliente) => {
    onChange(cliente);
    setTexto("");
    setAbierto(false);
  };

  const alTeclear = (e) => {
    if (!abierto) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActivo((i) => Math.min(i + 1, resultados.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActivo((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && resultados[activo]) {
      e.preventDefault();
      elegir(resultados[activo].valor);
    } else if (e.key === "Escape") {
      setAbierto(false);
    }
  };

  return (
    <div>
      <span className={clases.etiqueta}>{etiqueta}</span>
      <div ref={contenedor} className="relative">
        <input
          type="text"
          role="combobox"
          aria-expanded={abierto}
          aria-label={`Buscar ${etiqueta.toLowerCase()}`}
          className={`${clases.campo} pr-8`}
          placeholder={valor ? "" : placeholder}
          value={abierto ? texto : valor}
          onFocus={abrir}
          onChange={(e) => {
            setTexto(e.target.value);
            setActivo(0);
          }}
          onKeyDown={alTeclear}
        />

        {valor && !abierto && (
          <button
            type="button"
            aria-label={`Quitar ${etiqueta.toLowerCase()}`}
            onClick={() => onChange("")}
            className="absolute right-2 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded text-salvia-950/40 hover:bg-salvia-900/10 hover:text-salvia-950"
          >
            ×
          </button>
        )}

        {abierto && (
          <ul
            role="listbox"
            className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg bg-salvia-900 py-1 shadow-xl ring-1 ring-white/10"
          >
            {isLoading && <li className="px-3 py-2 text-sm text-white/50">Buscando…</li>}
            {!isLoading && resultados.length === 0 && (
              <li className="px-3 py-2 text-sm text-white/50">Sin resultados</li>
            )}
            {resultados.map((r, i) => (
              <li
                key={r.valor}
                role="option"
                aria-selected={i === activo}
                onMouseEnter={() => setActivo(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  elegir(r.valor);
                }}
                className={`cursor-pointer px-3 py-2 text-sm ${
                  i === activo ? "bg-white text-salvia-950" : "text-white"
                }`}
              >
                {r.valor}
                {r.detalle && r.detalle !== r.valor && (
                  <span className="block text-xs opacity-60">{r.detalle}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}