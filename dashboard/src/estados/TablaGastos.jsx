import { useState } from "react";
import { formatearFecha, formatearImporte } from "../lib/formato";

const horasTexto = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 });
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

function Fila({ categoria, detalle, planificadas, horas, gasto, previsto }) {
  return (
    <tr>
      <td className="py-2 pr-3">
        <div className="font-medium text-salvia-950">{categoria}</div>
        {detalle && <div className="text-xs text-salvia-950/50">{detalle}</div>}
      </td>
      <td className="py-2 px-2 text-center tabular-nums text-salvia-950/60">
        {planificadas ?? <span className="text-salvia-950/30">—</span>}
      </td>
      <td className="py-2 px-2 text-center tabular-nums">{horas ?? <span className="text-salvia-950/30">—</span>}</td>
      <td className="py-2 px-2 text-center tabular-nums">{gasto}</td>
      <td className="py-2 px-2 text-center tabular-nums text-salvia-950/50">{previsto}</td>
    </tr>
  );
}

// Fila de gastos directos con su desplegable de registros
function FilaDirectos({ directos, mostrarProyecto }) {
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
        <td className="py-2 px-2 text-center text-salvia-950/30">—</td>
        <td className="py-2 px-2 text-center text-salvia-950/30">—</td>
        <td className="py-2 px-2 text-center tabular-nums">{formatearImporte(directos.coste)}</td>
        <td className="py-2 px-2 text-center tabular-nums text-salvia-950/50">{formatearImporte(directos.coste_previsto)}</td>
      </tr>

      {abierta && (
        <tr>
          <td colSpan={5} className="pb-3">
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
                        {mostrarProyecto && <span className="ml-1.5 font-mono text-salvia-950/40">{g.proyecto}</span>}
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

// Tabla de gastos de un proyecto: personal por posición (horas planificadas hasta hoy, horas cargadas y
// su coste congelado), gastos directos (desplegables), indirectos y total, frente a lo previsto en el fee.
// `gastos` es la parte "gastos" de prototipo.api.estados.obtener_estado.
export default function TablaGastos({ gastos: g }) {
  // Las posiciones del fee siempre (la API las devuelve primero); las demás solo si tienen horas
  const filas = g.personal.filas.filter((f, i) => i < 5 || f.horas || f.horas_previstas || f.horas_planificadas);

  return (
    <div className="space-y-4">
      {g.acuerdo_marco && (
        <p className="rounded-lg border-l-4 border-salvia-900 bg-salvia-100 px-3 py-2 text-sm text-salvia-950">
          {g.basados.length
            ? `Suma de ${g.basados.length} ${g.basados.length === 1 ? "contrato basado aceptado" : "contratos basados aceptados"}.`
            : "Este acuerdo marco todavía no tiene contratos basados aceptados."}
        </p>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-salvia-900/10 text-left">
            <th className={th}>Categoría</th>
            <th className={`${th} w-28 px-2 text-center`} title="Horas planificadas hasta hoy">
              Planificadas
            </th>
            <th className={`${th} w-28 px-2 text-center`} title="Horas cargadas en la carga de horas">
              Cargadas
            </th>
            <th className={`${th} w-28 px-2 text-center`}>Gasto</th>
            <th className={`${th} w-28 px-2 text-center`}>Previsto</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-salvia-900/5">
          {filas.map((f) => (
            <Fila
              key={f.posicion}
              categoria={f.posicion}
              detalle={f.horas_previstas ? `Fee: ${horasTexto.format(f.horas_previstas)} h` : undefined}
              planificadas={f.horas_planificadas ? `${horasTexto.format(f.horas_planificadas)} h` : undefined}
              horas={f.horas ? `${horasTexto.format(f.horas)} h` : undefined}
              gasto={formatearImporte(f.coste)}
              previsto={formatearImporte(f.coste_previsto)}
            />
          ))}

          <FilaDirectos directos={g.directos} mostrarProyecto={g.acuerdo_marco} />

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
            <td className="pt-3 px-2 text-center font-bold tabular-nums text-salvia-950/60">
              {g.personal.horas_planificadas ? `${horasTexto.format(g.personal.horas_planificadas)} h` : ""}
            </td>
            <td className="pt-3 px-2 text-center font-bold tabular-nums text-salvia-950">
              {g.personal.horas ? `${horasTexto.format(g.personal.horas)} h` : ""}
            </td>
            <td className="pt-3 px-2 text-center font-bold tabular-nums text-salvia-950">
              {formatearImporte(g.total.real)}
            </td>
            <td className="pt-3 px-2 text-center font-bold tabular-nums text-salvia-950/50">
              {g.total.previsto ? formatearImporte(g.total.previsto) : "—"}
            </td>
          </tr>
        </tfoot>
      </table>

      {g.acuerdo_marco && g.sin_fee.length > 0 && (
        <p className="text-xs text-salvia-950/60">Sin fee estimate (su previsto no cuenta): {g.sin_fee.join(", ")}.</p>
      )}
    </div>
  );
}