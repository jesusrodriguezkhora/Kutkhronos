import { Link, useParams } from "react-router-dom";
import { useFrappeGetCall } from "frappe-react-sdk";
import TablaGastos from "./TablaGastos";
import { GraficoGasto, GraficoHoras } from "./GraficosMensuales";
import { mensajeDeError } from "../lib/errores";
import { formatearFecha, formatearImporte } from "../lib/formato";

const numero = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 });
const pct = (v) => (v == null ? "—" : `${numero.format(v)} %`);
const conSigno = (v, texto) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${texto}`;

function Tarjeta({ titulo, subtitulo, className = "", children }) {
  return (
    <section className={`rounded-xl border border-salvia-900/10 bg-white p-5 ${className}`}>
      <h2 className="text-sm font-bold">{titulo}</h2>
      {subtitulo && <p className="mt-0.5 text-xs text-salvia-950/50">{subtitulo}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

// Margen bruto y neto: real (con los gastos reales) frente al previsto en el fee y al objetivo
function Margenes({ margenes }) {
  if (!margenes.real) {
    return (
      <p className="rounded-lg bg-salvia-900/[0.03] px-3 py-3 text-sm text-salvia-950/60">
        Sin fee estimate: no hay honorarios con los que calcular los márgenes.
      </p>
    );
  }

  const filas = [
    { etiqueta: "Margen bruto", clave: "bruto" },
    { etiqueta: "Margen neto", clave: "neto" },
  ];

  return (
    <div className="space-y-4">
      {filas.map(({ etiqueta, clave }) => {
        const real = margenes.real[clave];
        const realPct = margenes.real[`${clave}_pct`];
        const previsto = margenes.previsto[clave];
        const previstoPct = margenes.previsto[`${clave}_pct`];
        const objetivo = margenes.objetivo[`${clave}_pct`];
        const cumple = realPct != null && realPct >= objetivo;
        const diferencia = real - previsto;

        return (
          <div key={clave} className="rounded-lg border border-salvia-900/10 p-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-salvia-950/60">{etiqueta}</span>
              <span className={`text-xs font-semibold ${cumple ? "text-salvia-800" : "text-red-700"}`}>
                {cumple ? "✓" : "✗"} Objetivo {objetivo} %
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className={`text-2xl font-semibold tabular-nums ${cumple ? "text-salvia-950" : "text-red-700"}`}>
                {pct(realPct)}
              </span>
              <span className="tabular-nums text-salvia-950/60">{formatearImporte(real)}</span>
            </div>
            <dl className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <div>
                <dt className="text-salvia-950/50">Previsto en el fee</dt>
                <dd className="tabular-nums text-salvia-950">
                  {pct(previstoPct)} · {formatearImporte(previsto)}
                </dd>
              </div>
              <div>
                <dt className="text-salvia-950/50">Diferencia</dt>
                <dd className={`tabular-nums ${diferencia < 0 ? "text-red-700" : "text-salvia-950"}`}>
                  {conSigno(diferencia, formatearImporte(Math.abs(diferencia)))}
                  {realPct != null && previstoPct != null &&
                    ` · ${conSigno(realPct - previstoPct, `${numero.format(Math.abs(realPct - previstoPct))} p.p.`)}`}
                </dd>
              </div>
            </dl>
          </div>
        );
      })}
    </div>
  );
}

// Estado de un proyecto (/estados/<código>): cabecera, gastos, márgenes y evolución mensual
export default function EstadoProyecto() {
  const { codigo } = useParams();
  const { data, error, isLoading } = useFrappeGetCall("prototipo.api.estados.obtener_estado", { proyecto: codigo });
  const estado = data?.message;
  const p = estado?.proyecto;

  return (
    <section className="space-y-6">
      <Link to="/estados" className="text-sm font-medium text-salvia-950/60 hover:text-salvia-950">
        ← Volver al buscador
      </Link>

      {isLoading && <p className="text-sm text-salvia-950/50">Cargando estado…</p>}
      {error && <p className="text-sm text-red-600">{mensajeDeError(error)}</p>}

      {estado && (
        <>
          {/* Cabecera */}
          <div>
            <p className="font-mono text-sm text-salvia-950/60">{p.name}</p>
            <h1 className="text-3xl font-bold tracking-tight">{p.descripcion || p.name}</h1>
            <p className="mt-1 text-lg text-salvia-950/80">{p.cliente || "—"}</p>
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-salvia-950/60">
              <span>{p.tipo}</span>
              {p.responsable_nombre && <span>Responsable: {p.responsable_nombre}</span>}
              {(p.fecha_inicio || p.fecha_fin) && (
                <span>
                  {formatearFecha(p.fecha_inicio)} → {formatearFecha(p.fecha_fin)}
                </span>
              )}
              <span>Importe: {formatearImporte(p.importe)}</span>
            </p>
          </div>

          {/* Gastos y márgenes */}
          <div className="grid gap-6 lg:grid-cols-5">
            <Tarjeta
              titulo="Gastos"
              subtitulo="Horas de la carga de horas, con el coste/hora medio de cada posición al cargarlas."
              className="lg:col-span-3"
            >
              <TablaGastos gastos={estado.gastos} />
            </Tarjeta>
            <Tarjeta
              titulo="Márgenes"
              subtitulo={
                estado.margenes.real ? `Sobre los honorarios del fee: ${formatearImporte(estado.margenes.ingresos)}` : undefined
              }
              className="lg:col-span-2"
            >
              <Margenes margenes={estado.margenes} />
            </Tarjeta>
          </div>

          {/* Evolución mensual */}
          <div className="grid gap-6 lg:grid-cols-2">
            <GraficoHoras mensual={estado.mensual} />
            <GraficoGasto mensual={estado.mensual} />
          </div>
        </>
      )}
    </section>
  );
}