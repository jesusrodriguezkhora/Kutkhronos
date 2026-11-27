import { useState } from "react";
import { Link } from "react-router-dom";
import { useFrappeGetCall } from "frappe-react-sdk";
import IconoBuscar from "../componentes/IconoBuscar";
import { ESTILOS } from "../lib/estilos";
import { useDebounced } from "../hooks/useDebounced";
import { mensajeDeError } from "../lib/errores";

// Buscador de proyectos aceptados: busca mientras se escribe (código, descripción o cliente)
export default function Buscador() {
  const [texto, setTexto] = useState("");
  const buscado = useDebounced(texto.trim(), 300);

  const { data, error, isLoading } = useFrappeGetCall(
    "prototipo.api.estados.buscar_proyectos",
    { texto: buscado },
    undefined,
    { keepPreviousData: true }
  );
  const resultados = data?.message ?? [];

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Estados</h1>
        <p className="mt-1 text-sm text-salvia-950/60">
          Gastos reales y márgenes de los proyectos aceptados.
        </p>
      </div>

      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-salvia-950/40">
          <IconoBuscar />
        </span>
        <input
          type="search"
          autoFocus
          aria-label="Buscar proyecto"
          placeholder="Busca por código, descripción o cliente"
          className={`${ESTILOS.claro.campo} py-3 pl-9 text-base`}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-red-600">{mensajeDeError(error)}</p>}

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-salvia-950/50">
          {buscado ? "Resultados" : "Últimos proyectos aceptados"}
        </p>

        {isLoading ? (
          <p className="text-sm text-salvia-950/50">Buscando…</p>
        ) : resultados.length === 0 ? (
          <p className="rounded-xl border border-salvia-900/10 bg-white px-4 py-6 text-sm text-salvia-950/50">
            {buscado ? `Ningún proyecto aceptado coincide con «${buscado}».` : "Todavía no hay proyectos aceptados."}
          </p>
        ) : (
          <ul className="divide-y divide-salvia-900/10 overflow-hidden rounded-xl border border-salvia-900/10 bg-white">
            {resultados.map((p) => (
              <li key={p.name}>
                <Link
                  to={encodeURIComponent(p.name)}
                  className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-salvia-50"
                >
                  <span className="w-36 shrink-0 font-mono text-sm font-medium">{p.name}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-salvia-950">{p.descripcion || "—"}</span>
                    <span className="block truncate text-xs text-salvia-950/50">
                      {[p.cliente, p.tipo].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span aria-hidden="true" className="text-salvia-950/30">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}