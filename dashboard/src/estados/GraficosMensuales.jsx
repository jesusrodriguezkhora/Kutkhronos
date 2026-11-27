import { Tarjeta } from "../panel/graficos";
import { formatearImporte, formatearImporteCompacto } from "../lib/formato";

const numero = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 });
const mesCorto = new Intl.DateTimeFormat("es-ES", { month: "short", year: "2-digit" });
const mesLargo = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" });

const formatoHoras = (v) => `${numero.format(v)} h`;

// "AAAA-MM" -> fecha del día 1 (a mediodía, para que la zona horaria no la mueva al mes anterior)
const fechaDeMes = (mes) => new Date(`${mes}-01T12:00:00`);

// Series de cada gráfico. En el de gasto, personal y directos son partes del mismo total: dos tonos
// de la rampa salvia (el oscuro abajo, el que más pesa) separados por un hueco de 2 px.
const SERIES_HORAS = [{ clave: "horas", etiqueta: "Horas", fondo: "bg-salvia-700" }];
const SERIES_GASTO = [
  { clave: "personal", etiqueta: "Personal", fondo: "bg-salvia-700" },
  { clave: "directos", etiqueta: "Gastos directos", fondo: "bg-salvia-300" },
];

// Techo "redondo" del eje: 1, 2, 2,5 o 5 por una potencia de 10, igual o mayor que el valor
function maximoRedondo(valor) {
  if (valor <= 0) return 1;
  const potencia = 10 ** Math.floor(Math.log10(valor));
  return [1, 2, 2.5, 5, 10].find((p) => p * potencia >= valor) * potencia;
}

function Leyenda({ series }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-salvia-950/60">
      {series.map((s) => (
        <li key={s.clave} className="flex items-center gap-1.5">
          <span className={`h-2.5 w-2.5 rounded-sm ${s.fondo}`} />
          {s.etiqueta}
        </li>
      ))}
    </ul>
  );
}

// Barras verticales, una por mes; si hay varias series, apiladas (la primera abajo).
// meses: [{ mes: "AAAA-MM", <serie>: valor, ... }] (la parte "mensual" de obtener_estado)
function BarrasMensuales({ meses, series, formato, formatoEje }) {
  if (meses.length === 0) {
    return (
      <p className="grid h-48 place-items-center rounded-lg bg-salvia-900/[0.03] text-sm text-salvia-950/50">
        Todavía no hay nada registrado en este proyecto.
      </p>
    );
  }

  const total = (m) => series.reduce((s, x) => s + (m[x.clave] || 0), 0);
  const maximo = maximoRedondo(Math.max(0, ...meses.map(total)));
  const marcas = [maximo, maximo / 2, 0];
  const alto = (v) => `${(v / maximo) * 100}%`;
  // Como mucho 12 etiquetas en el eje horizontal: con más meses, una de cada `paso`
  const paso = Math.ceil(meses.length / 12);

  return (
    <div className="flex gap-2">
      {/* Eje vertical: 0, la mitad y el techo */}
      <div className="relative h-48 w-16 shrink-0 text-right text-xs tabular-nums text-salvia-950/50">
        {marcas.map((v) => (
          <span key={v} className="absolute right-0" style={{ bottom: alto(v), transform: "translateY(50%)" }}>
            {formatoEje(v)}
          </span>
        ))}
      </div>

      <div className="min-w-0 flex-1">
        <div className="relative h-48">
          {/* Cuadrícula: la línea base más marcada que las demás */}
          {marcas.map((v) => (
            <div
              key={v}
              className={`absolute inset-x-0 border-t ${v === 0 ? "border-salvia-900/25" : "border-dashed border-salvia-900/10"}`}
              style={{ bottom: alto(v) }}
            />
          ))}

          <div className="absolute inset-0 flex gap-1">
            {meses.map((m, i) => {
              const visibles = series.filter((s) => m[s.clave] > 0);
              const fecha = fechaDeMes(m.mes);
              // El globo se abre hacia dentro del gráfico para que no se salga por los lados
              const lado = i < meses.length / 2 ? "left-0" : "right-0";
              return (
                <div
                  key={m.mes}
                  tabIndex={0}
                  aria-label={`${mesLargo.format(fecha)}: ${formato(total(m))}`}
                  className="group relative flex h-full flex-1 justify-center rounded-t outline-none hover:bg-salvia-900/5 focus-visible:ring-2 focus-visible:ring-salvia"
                >
                  {/* Segmentos de abajo arriba: flex-col-reverse pone la primera serie en la base */}
                  <div className="flex h-full w-full max-w-[2.5rem] flex-col-reverse gap-[2px]">
                    {visibles.map((s, j) => (
                      <div
                        key={s.clave}
                        className={`${s.fondo} ${j === visibles.length - 1 ? "rounded-t" : ""}`}
                        style={{ height: alto(m[s.clave]) }}
                      />
                    ))}
                  </div>

                  <div
                    role="tooltip"
                    className={`pointer-events-none absolute bottom-full z-20 mb-1 hidden whitespace-nowrap rounded-lg bg-salvia-950 px-3 py-2 text-xs text-white shadow-lg group-hover:block group-focus:block ${lado}`}
                  >
                    <p className="mb-1 font-semibold first-letter:uppercase">{mesLargo.format(fecha)}</p>
                    {series.map((s) => (
                      <div key={s.clave} className="flex items-center justify-between gap-4">
                        {series.length > 1 && (
                          <span className="flex items-center gap-1.5">
                            <span className={`h-2 w-2 rounded-sm ${s.fondo}`} />
                            {s.etiqueta}
                          </span>
                        )}
                        <span className="tabular-nums">{formato(m[s.clave] || 0)}</span>
                      </div>
                    ))}
                    {series.length > 1 && (
                      <div className="mt-1 flex justify-between gap-4 border-t border-white/20 pt-1">
                        <span>Total</span>
                        <span className="tabular-nums">{formato(total(m))}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Eje horizontal: los meses */}
        <div className="mt-1.5 flex gap-1 text-xs text-salvia-950/50">
          {meses.map((m, i) => (
            <span key={m.mes} className="flex-1 whitespace-nowrap text-center">
              {i % paso === 0 ? mesCorto.format(fechaDeMes(m.mes)) : ""}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// Vista en tabla (la misma información, sin depender del color ni del ratón)
function tabla(meses, series, formato) {
  return {
    columnas: [
      { clave: "mesTexto", etiqueta: "Mes" },
      ...series.map((s) => ({ clave: s.clave, etiqueta: s.etiqueta, numero: true, formato })),
      ...(series.length > 1 ? [{ clave: "total", etiqueta: "Total", numero: true, formato }] : []),
    ],
    filas: meses.map((m) => ({
      ...m,
      mesTexto: mesLargo.format(fechaDeMes(m.mes)),
      total: series.reduce((s, x) => s + (m[x.clave] || 0), 0),
    })),
  };
}

export function GraficoHoras({ mensual }) {
  return (
    <Tarjeta
      titulo="Horas dedicadas por mes"
      subtitulo="Horas cargadas en el proyecto en la carga de horas."
      tabla={mensual.length ? tabla(mensual, SERIES_HORAS, formatoHoras) : undefined}
    >
      <BarrasMensuales meses={mensual} series={SERIES_HORAS} formato={formatoHoras} formatoEje={formatoHoras} />
    </Tarjeta>
  );
}

export function GraficoGasto({ mensual }) {
  return (
    <Tarjeta
      titulo="Gasto por mes"
      subtitulo="Personal y gastos directos (los indirectos no se reparten por meses)."
      leyenda={mensual.length ? <Leyenda series={SERIES_GASTO} /> : undefined}
      tabla={mensual.length ? tabla(mensual, SERIES_GASTO, formatearImporte) : undefined}
    >
      <BarrasMensuales
        meses={mensual}
        series={SERIES_GASTO}
        formato={formatearImporte}
        formatoEje={formatearImporteCompacto}
      />
    </Tarjeta>
  );
}