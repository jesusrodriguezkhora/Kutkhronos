import { useState } from "react";
import { formatearImporte, formatearImporteCompacto } from "../lib/formato";
import { SERIES, etiquetaMes, maximoRedondo } from "./series";

// --- Piezas comunes ---

export function Leyenda({ series }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-salvia-950/60">
      {series.map((clave) => (
        <li key={clave} className="flex items-center gap-1.5">
          <span className={`h-2.5 w-2.5 rounded-sm ${SERIES[clave].fondo}`} />
          {SERIES[clave].etiqueta}
        </li>
      ))}
    </ul>
  );
}

// Tarjeta de un gráfico, con su vista en tabla (los mismos datos, accesibles sin color ni ratón)
export function Tarjeta({ titulo, subtitulo, leyenda, tabla, className = "", children }) {
  const [verTabla, setVerTabla] = useState(false);

  return (
    <section className={`rounded-xl border border-salvia-900/10 bg-white p-5 ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold">{titulo}</h2>
          {subtitulo && <p className="mt-0.5 text-xs text-salvia-950/50">{subtitulo}</p>}
        </div>
        {tabla && (
          <button
            type="button"
            onClick={() => setVerTabla((v) => !v)}
            className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-salvia-950/60 hover:bg-salvia-900/5 hover:text-salvia-950"
          >
            {verTabla ? "Ver gráfico" : "Ver tabla"}
          </button>
        )}
      </div>
      {leyenda && !verTabla && <div className="mb-4">{leyenda}</div>}
      {verTabla ? <Tabla {...tabla} /> : children}
    </section>
  );
}

function Tabla({ columnas, filas }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-salvia-900/10 text-left text-xs uppercase tracking-wider text-salvia-950/50">
            {columnas.map((c) => (
              <th key={c.clave} className={`py-2 font-semibold ${c.numero ? "text-right" : ""}`}>
                {c.etiqueta}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-salvia-900/5">
          {filas.map((f, i) => (
            <tr key={i}>
              {columnas.map((c) => (
                <td key={c.clave} className={`py-2 ${c.numero ? "text-right tabular-nums" : ""}`}>
                  {c.formato ? c.formato(f[c.clave]) : f[c.clave]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Globo con el detalle de una barra: aparece al pasar el ratón o al llegar con el tabulador
function Globo({ children, className = "" }) {
  return (
    <div
      role="tooltip"
      className={`pointer-events-none absolute z-20 hidden whitespace-nowrap rounded-lg bg-salvia-950 px-3 py-2 text-xs text-white shadow-lg group-hover:block group-focus:block ${className}`}
    >
      {children}
    </div>
  );
}

function LineaGlobo({ serie, valor }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-1.5">
        <span className={`h-2 w-2 rounded-sm ${SERIES[serie].fondo}`} />
        {SERIES[serie].etiqueta}
      </span>
      <span className="tabular-nums">{formatearImporte(valor)}</span>
    </div>
  );
}

// --- Indicadores ---

export function Indicador({ etiqueta, valor, detalle, children }) {
  return (
    <div className="rounded-xl border border-salvia-900/10 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-salvia-950/60">{etiqueta}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight">{valor}</p>
      {detalle && <p className="mt-1 text-xs text-salvia-950/50">{detalle}</p>}
      {children}
    </div>
  );
}

// Barra de progreso: el fondo es un paso más claro de la misma rampa
export function Medidor({ parte, total, etiqueta, className = "mt-3" }) {
  const porcentaje = total > 0 ? Math.min(100, (parte / total) * 100) : 0;
  return (
    <div
      className={`${className} h-2 overflow-hidden rounded-full bg-salvia-100`}
      role="meter"
      aria-label={etiqueta}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(porcentaje)}
    >
      <div className="h-full rounded-full bg-salvia-700" style={{ width: `${porcentaje}%` }} />
    </div>
  );
}

// --- Barras horizontales ---

// Una fila por categoría; cada barra suma sus segmentos (series), separados por un hueco de 2 px.
// filas: [{ clave, num, segmentos: { serie: importe } }]
export function BarrasHorizontales({ filas, series, anchoEtiqueta = "w-32" }) {
  const total = (f) => series.reduce((s, serie) => s + (f.segmentos[serie] || 0), 0);
  const maximo = Math.max(0, ...filas.map(total));

  if (filas.length === 0) {
    return <p className="text-sm text-salvia-950/50">Sin datos.</p>;
  }

  return (
    <ul className="space-y-2.5">
      {filas.map((f) => {
        const suma = total(f);
        const visibles = series.filter((s) => f.segmentos[s] > 0);
        return (
          <li
            key={f.clave}
            tabIndex={0}
            className="group relative flex items-center gap-3 rounded-md text-sm outline-none focus-visible:ring-2 focus-visible:ring-salvia"
          >
            <span className={`${anchoEtiqueta} shrink-0 truncate text-salvia-950/80`} title={f.clave}>
              {f.clave}
            </span>
            <div className="flex h-5 flex-1 gap-[2px]">
              {visibles.map((s, i) => (
                <div
                  key={s}
                  className={`${SERIES[s].fondo} ${i === visibles.length - 1 ? "rounded-r" : ""}`}
                  style={{ width: `${maximo ? (f.segmentos[s] / maximo) * 100 : 0}%` }}
                />
              ))}
            </div>
            <span className="w-24 shrink-0 text-right tabular-nums">
              <span className="font-medium">{formatearImporteCompacto(suma)}</span>
              <span className="ml-1.5 text-xs text-salvia-950/50">{f.num}</span>
            </span>

            <Globo className="bottom-full left-1/3 mb-1">
              <p className="mb-1 font-semibold">
                {f.clave} · {f.num} {f.num === 1 ? "proyecto" : "proyectos"}
              </p>
              {visibles.map((s) => (
                <LineaGlobo key={s} serie={s} valor={f.segmentos[s]} />
              ))}
              {visibles.length > 1 && (
                <div className="mt-1 flex justify-between gap-4 border-t border-white/20 pt-1">
                  <span>Total</span>
                  <span className="tabular-nums">{formatearImporte(suma)}</span>
                </div>
              )}
            </Globo>
          </li>
        );
      })}
    </ul>
  );
}

// --- Columnas por mes ---

const ALTO_GRAFICO = 160; // px del área de dibujo, sin contar las etiquetas de los meses

export function ColumnasMes({ meses }) {
  const maximo = maximoRedondo(Math.max(0, ...meses.map((m) => m.importe)));
  const destacado = meses.reduce((a, b) => (b.importe > a.importe ? b : a), meses[0]);

  return (
    // pt-6: hueco para la etiqueta de la columna más alta, que va encima de ella
    <div className="flex gap-2 pt-6">
      {/* Eje: 0, mitad y máximo */}
      <div
        className="relative w-14 shrink-0 text-right text-xs tabular-nums text-salvia-950/50"
        style={{ height: ALTO_GRAFICO }}
      >
        {[1, 0.5, 0].map((f) => (
          <span
            key={f}
            className="absolute right-0 -translate-y-1/2"
            style={{ top: (1 - f) * ALTO_GRAFICO }}
          >
            {formatearImporteCompacto(maximo * f)}
          </span>
        ))}
      </div>

      <div className="flex-1">
        <div className="relative" style={{ height: ALTO_GRAFICO }}>
          {[1, 0.5, 0].map((f) => (
            <div
              key={f}
              className="absolute inset-x-0 border-t border-salvia-900/10"
              style={{ top: (1 - f) * ALTO_GRAFICO }}
            />
          ))}
          <div className="absolute inset-0 flex">
            {meses.map((m) => {
              const alto = (m.importe / maximo) * ALTO_GRAFICO;
              return (
                <div
                  key={m.mes}
                  tabIndex={0}
                  className="group relative flex flex-1 items-end justify-center outline-none focus-visible:bg-salvia/10 hover:bg-salvia/10"
                >
                  {m === destacado && m.importe > 0 && (
                    <span
                      className="absolute text-xs font-medium tabular-nums"
                      style={{ bottom: alto + 4 }}
                    >
                      {formatearImporteCompacto(m.importe)}
                    </span>
                  )}
                  {m.importe > 0 && (
                    <div
                      className="w-full max-w-[24px] rounded-t bg-salvia-700"
                      style={{ height: Math.max(alto, 2) }}
                    />
                  )}
                  <Globo className="bottom-full mb-1">
                    <p className="font-semibold">{etiquetaMes(m.mes, true)}</p>
                    <p className="tabular-nums">{formatearImporte(m.importe)}</p>
                    <p className="text-white/60">
                      {m.num} {m.num === 1 ? "alta" : "altas"}
                    </p>
                  </Globo>
                </div>
              );
            })}
          </div>
        </div>
        <div className="mt-1.5 flex text-xs text-salvia-950/50">
          {meses.map((m, i) => (
            <span key={m.mes} className="flex-1 text-center">
              {etiquetaMes(m.mes, i === 0)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
