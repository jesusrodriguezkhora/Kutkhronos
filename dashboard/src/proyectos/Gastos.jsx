import { useState } from "react";
import { useFrappeGetCall } from "frappe-react-sdk";
import { mensajeDeError } from "../lib/errores";
import { formatearFecha, formatearImporte } from "../lib/formato";

const horasTexto = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 });
const porcentaje = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1, signDisplay: "always" });
const th = "pb-2 text-xs font-semibold uppercase tracking-wider text-salvia-950/60";

// Flecha del desplegable de gastos directos
function Flecha({ abierta }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className={`h-4 w-4 transition-transform ${abierta ? "rotate-90" : ""}`}
      aria-hidden="true"
    >
      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.17 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Z" clipRule="evenodd" />
    </svg>
  );
}

function Fila({ categoria, detalle, horas, gasto, previsto }) {
  return (
    <tr>
      <td className="py-2 pr-3">
        <div className="font-medium text-salvia-950">{categoria}</div>
        {detalle && <div className="text-xs text-salvia-950/50">{detalle}</div>}
      </td>
      <td className="py-2 pr-3 text-right tabular-nums">{horas ?? <span className="text-salvia-950/30">—</span>}</td>
      <td className="py-2 pr-3 text-right tabular-nums">{gasto}</td>
      <td className="py-2 text-right tabular-nums text-salvia-950/50">{previsto}</td>
    </tr>
  );
}

// Fila de gastos directos con su desplegable de registros
function FilaDirectos({ directos }) {
  const [abierta, setAbierta] = useState(false);
  const n = directos.gastos.length;
  return (
    <>
      <tr>
        <td className="py-2 pr-3">
          <button
            type="button"
            onClick={() => setAbierta((a) => !a)}
            aria-expanded={abierta}
            className="inline-flex items-center gap-1.5 font-medium text-salvia-950 hover:text-salvia-700"
          >
            <Flecha abierta={abierta} />
            Gastos directos
          </button>
          <div className="pl-5 text-xs text-salvia-950/50">
            {n === 0 ? "Sin gastos registrados" : `${n} ${n === 1 ? "gasto registrado" : "gastos registrados"}`}
          </div>
        </td>
        <td className="py-2 pr-3 text-right text-salvia-950/30">—</td>
        <td className="py-2 pr-3 text-right tabular-nums">{formatearImporte(directos.coste)}</td>
        <td className="py-2 text-right tabular-nums text-salvia-950/50">{formatearImporte(directos.coste_previsto)}</td>
      </tr>

      {abierta && (
        <tr>
          <td colSpan={4} className="pb-3">
            {n === 0 ? (
              <p className="rounded-lg bg-salvia-900/[0.03] px-3 py-2 text-xs text-salvia-950/50">
                Todavía no se ha registrado ningún gasto directo en este proyecto.
              </p>
            ) : (
              <table className="w-full rounded-lg bg-salvia-900/[0.03] text-xs">
                <thead>
                  <tr className="text-left text-salvia-950/50">
                    <th className="px-3 pb-1 pt-2 font-semibold">Fecha</th>
                    <th className="px-3 pb-1 pt-2 font-semibold">Tipo</th>
                    <th className="px-3 pb-1 pt-2 font-semibold">Concepto</th>
                    <th className="px-3 pb-1 pt-2 text-right font-semibold">Coste</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-salvia-900/5">
                  {directos.gastos.map((g) => (
                    <tr key={g.name}>
                      <td className="whitespace-nowrap px-3 py-1.5 tabular-nums">{formatearFecha(g.fecha)}</td>
                      <td className="whitespace-nowrap px-3 py-1.5">{g.tipo}</td>
                      <td className="px-3 py-1.5">
                        {g.concepto}
                        {/* En un acuerdo marco, de qué contrato basado es cada gasto */}
                        {directos.mostrarProyecto && (
                          <span className="ml-1.5 font-mono text-salvia-950/40">{g.proyecto}</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums">{formatearImporte(g.coste)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

// Tarjeta de comparación del gasto total real con el previsto en el fee
function Comparacion({ total, sinFee }) {
  if (!total.previsto) {
    return (
      <div className="rounded-xl border border-salvia-900/10 bg-salvia-900/[0.03] px-4 py-3 text-sm text-salvia-950/60">
        Sin fee estimate: no hay gasto previsto con el que comparar.
      </div>
    );
  }
  const supera = total.supera;
  return (
    <div className={`rounded-xl border px-4 py-3 ${supera ? "border-red-200 bg-red-50" : "border-salvia-300 bg-salvia-100"}`}>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-salvia-950/60">Gasto real</div>
          <div className="text-lg font-semibold tabular-nums text-salvia-950">{formatearImporte(total.real)}</div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-salvia-950/60">Gasto previsto</div>
          <div className="text-lg font-semibold tabular-nums text-salvia-950">{formatearImporte(total.previsto)}</div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-salvia-950/60">Diferencia</div>
          <div className={`text-lg font-semibold tabular-nums ${supera ? "text-red-700" : "text-salvia-800"}`}>
            {total.diferencia > 0 ? "+" : ""}
            {formatearImporte(total.diferencia)}
            <span className="ml-1 text-sm font-normal">/ {porcentaje.format(total.porcentaje)} %</span>
          </div>
        </div>
      </div>
      <p className={`mt-2 text-xs ${supera ? "text-red-700" : "text-salvia-800"}`}>
        {supera ? "✗ El gasto real supera el previsto en el fee estimate." : "✓ Dentro del gasto previsto en el fee estimate."}
      </p>
      {sinFee.length > 0 && (
        <p className="mt-1 text-xs text-salvia-950/60">
          Sin fee estimate (su previsto no cuenta): {sinFee.join(", ")}.
        </p>
      )}
    </div>
  );
}

// Pestaña Gastos de la ficha del proyecto: gasto real (carga de horas, gastos directos e indirectos)
// frente al previsto en el fee. Solo lectura; lo calcula el servidor (prototipo/api/gastos.py).
export default function Gastos({ proyecto }) {
  const { data, error, isLoading } = useFrappeGetCall("prototipo.api.gastos.obtener_gastos", { proyecto });
  const g = data?.message;

  if (isLoading) return <p className="p-6 text-sm text-salvia-950/50">Calculando gastos…</p>;
  if (error || !g) return <p className="p-6 text-sm text-red-600">{mensajeDeError(error)}</p>;

  // Las posiciones del fee siempre; las demás (p. ej. "Sin posición") solo si tienen horas
  const filas = g.personal.filas.filter(
    (f, i) => i < 5 || f.horas || f.horas_previstas
  );

  return (
    <>
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6">
        {g.acuerdo_marco && (
          <p className="rounded-lg border-l-4 border-salvia-900 bg-salvia-100 px-3 py-2 text-sm text-salvia-950">
            {g.basados.length
              ? `Suma de ${g.basados.length} ${g.basados.length === 1 ? "contrato basado" : "contratos basados"} aceptados, en curso o cerrados.`
              : "Este acuerdo marco todavía no tiene contratos basados aceptados."}
          </p>
        )}

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-salvia-900/10 text-left">
              <th className={th}>Categoría</th>
              <th className={`${th} w-24 pr-3 text-right`}>Horas</th>
              <th className={`${th} w-32 pr-3 text-right`}>Gasto</th>
              <th className={`${th} w-32 text-right`}>Previsto</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-salvia-900/5">
            {filas.map((f) => (
              <Fila
                key={f.posicion}
                categoria={f.posicion}
                detalle={f.horas_previstas ? `Fee: ${horasTexto.format(f.horas_previstas)} h` : undefined}
                horas={f.horas ? `${horasTexto.format(f.horas)} h` : undefined}
                gasto={formatearImporte(f.coste)}
                previsto={formatearImporte(f.coste_previsto)}
              />
            ))}

            <FilaDirectos directos={{ ...g.directos, mostrarProyecto: g.acuerdo_marco }} />

            <Fila
              categoria="Gastos indirectos"
              detalle={`${g.indirectos.porcentaje} % de los honorarios del fee`}
              gasto={formatearImporte(g.indirectos.coste)}
              previsto={formatearImporte(g.indirectos.coste)}
            />
          </tbody>

          <tfoot>
            <tr className="border-t-2 border-salvia-900/15">
              <td className="pt-3 font-bold text-salvia-950">Gasto total</td>
              <td className="pt-3 pr-3 text-right font-bold tabular-nums text-salvia-950">
                {g.personal.horas ? `${horasTexto.format(g.personal.horas)} h` : ""}
              </td>
              <td className="pt-3 pr-3 text-right font-bold tabular-nums text-salvia-950">
                {formatearImporte(g.total.real)}
              </td>
              <td className="pt-3 text-right font-bold tabular-nums text-salvia-950/50">
                {g.total.previsto ? formatearImporte(g.total.previsto) : "—"}
              </td>
            </tr>
          </tfoot>
        </table>

        <Comparacion total={g.total} sinFee={g.acuerdo_marco ? g.sin_fee : []} />
      </div>

      <div className="border-t border-salvia-900/10 px-6 py-4">
        <p className="text-xs text-salvia-950/50">
          Solo lectura · horas de la carga de horas, con el coste/hora medio de cada posición en el momento de cargarlas.
        </p>
      </div>
    </>
  );
}