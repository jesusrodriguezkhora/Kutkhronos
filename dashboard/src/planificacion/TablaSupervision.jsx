import { formatearHoras } from "./calculo";

// Umbrales de desviación por encima de lo planificado (solo desviaciones positivas)
const UMBRAL_AMARILLO = 0.15;
const UMBRAL_ROJO = 0.3;

// Color del icono de aviso según la desviación
const COLOR_ICONO = {
  azul: "text-sky-600",
  amarillo: "text-amber-500",
  rojo: "text-red-600",
};

// Triángulo de aviso (icono "exclamation-triangle" sólido de Heroicons, licencia MIT)
export function IconoAdvertencia({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={`h-4 w-4 ${className}`} aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z"
      />
    </svg>
  );
}
// Mismo estilo que la tabla de planificación
const CELDA = "px-4 py-3";
const CABECERA = "bg-salvia-900 text-xs font-semibold uppercase tracking-wider text-salvia-200";
const FIJA_IZQUIERDA = "sticky left-0 z-10";
const FIJA_ARRIBA = "sticky top-0 z-20";
const ESQUINA_IZQUIERDA = "sticky left-0 top-0 z-30";
const FONDO_FILA = "bg-white";
const FONDO_CONCEPTO = "bg-salvia-50";

// Color del aviso de una celda o un total. Solo en semanas terminadas (carga cerrada) y solo cuando se
// ha cargado más de lo planificado: por encima de los umbrales, o con horas sin planificar (azul).
export function colorDe(real, planificado, terminada) {
  if (!terminada) return null;
  if (!planificado) return real > 0 ? "azul" : null;
  const desviacion = (real - planificado) / planificado; // positiva si se cargó más de lo planificado
  if (desviacion > UMBRAL_ROJO + 1e-9) return "rojo";
  if (desviacion > UMBRAL_AMARILLO + 1e-9) return "amarillo";
  return null;
}

// Texto al pasar el ratón: "+20 %", "−35 %" o "Sin planificar"
function textoDesviacion(real, planificado) {
  if (!planificado) return real > 0 ? "Sin planificar" : undefined;
  const porcentaje = Math.round(((real - planificado) / planificado) * 100);
  return `${porcentaje > 0 ? "+" : porcentaje < 0 ? "−" : ""}${Math.abs(porcentaje)} %`;
}

// "6 / 8" (cargado / planificado) y, si hay desviación, el icono de aviso a la derecha.
// Vacío si no hay ninguna de las dos.
function Valor({ real, planificado, terminada, className = "", negrita = false }) {
  const hay = real || planificado;
  const color = hay ? colorDe(real, planificado, terminada) : null;
  const desviacion = textoDesviacion(real, planificado);

  return (
    <td className={`${CELDA} ${className} whitespace-nowrap text-center tabular-nums ${negrita ? "font-semibold" : ""}`}>
      {hay ? (
        <span className="inline-flex items-center gap-1.5">
          <span>
            {formatearHoras(real) || "0"}
            <span className="opacity-50"> / {formatearHoras(planificado) || "0"}</span>
          </span>
          {color ? (
            <span role="img" aria-label={`Desviación: ${desviacion}`} title={desviacion}>
              <IconoAdvertencia className={COLOR_ICONO[color]} />
            </span>
          ) : (
            // Mismo hueco que el icono, para que los números queden alineados en la columna
            <span aria-hidden="true" className="h-4 w-4" />
          )}
        </span>
      ) : (
        ""
      )}
    </td>
  );
}
// Celdas de la API -> {fila: {empleado: {real, planificado}}}
function indexar(celdas) {
  const indice = {};
  for (const c of celdas) {
    indice[c.fila] = { ...indice[c.fila], [c.empleado]: { real: c.real, planificado: c.planificado } };
  }
  return indice;
}

const sumar = (valores) =>
  valores.reduce((t, v) => ({ real: t.real + (v?.real || 0), planificado: t.planificado + (v?.planificado || 0) }), {
    real: 0,
    planificado: 0,
  });

// Filas (proyectos y, en la vista completa, filas fijas) × personas, con columna Total.
// La fila Total solo en la vista completa (CEO y Administración).
export default function TablaSupervision({ info }) {
  const terminada = info.semana.terminada;
  const indice = indexar(info.celdas);
  const filas = [
    ...info.filas.map((p) => ({
      clave: p.name,
      titulo: p.name,
      subtitulo: [p.cliente, p.descripcion].filter(Boolean).join(" · "),
    })),
    ...info.conceptos.map((c) => ({ clave: c, titulo: c, fija: true })),
  ];

  if (filas.length === 0) {
    return (
      <p className="rounded-xl border border-salvia-900/10 bg-white px-4 py-6 text-sm text-salvia-950/50">
        {info.vista_completa
          ? "Esta semana no tiene horas planificadas ni imputadas."
          : "No tienes proyectos con horas planificadas esta semana."}
      </p>
    );
  }

  return (
    <div className="max-h-[70vh] overflow-auto rounded-xl border border-salvia-900/10">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className={`${CELDA} ${CABECERA} ${ESQUINA_IZQUIERDA} text-left align-bottom`}>Proyecto</th>
            {info.empleados.map((e) => (
              <th key={e.usuario} className={`${CELDA} ${CABECERA} ${FIJA_ARRIBA} min-w-[7rem] text-center align-bottom`}>
                {e.nombre}
              </th>
            ))}
            <th className={`${CELDA} ${CABECERA} ${FIJA_ARRIBA} border-l border-l-white/10 text-center align-bottom`}>
              Total
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-salvia-900/10">
          {filas.map((f) => {
            const fondo = f.fija ? FONDO_CONCEPTO : FONDO_FILA;
            const total = sumar(info.empleados.map((e) => indice[f.clave]?.[e.usuario]));
            return (
              <tr key={f.clave}>
                <th scope="row" className={`${CELDA} ${FIJA_IZQUIERDA} ${fondo} max-w-[16rem] text-left font-normal`}>
                  <div className={f.fija ? "font-medium" : "font-mono font-medium"}>{f.titulo}</div>
                  {f.subtitulo && (
                    <div className="truncate text-xs text-salvia-950/50" title={f.subtitulo}>
                      {f.subtitulo}
                    </div>
                  )}
                </th>
                {info.empleados.map((e) => {
                  const v = indice[f.clave]?.[e.usuario];
                  return (
                    <Valor
                      key={e.usuario}
                      real={v?.real || 0}
                      planificado={v?.planificado || 0}
                      terminada={terminada}
                      className={fondo}
                    />
                  );
                })}
                <Valor
                  real={total.real}
                  planificado={total.planificado}
                  terminada={terminada}
                  className={`${fondo} border-l border-salvia-900/10`}
                  negrita
                />
              </tr>
            );
          })}
        </tbody>

        {info.vista_completa && (
          <tfoot className="border-t border-salvia-900/15">
            <tr>
              <th scope="row" className={`${CELDA} ${FIJA_IZQUIERDA} bg-salvia-100 text-left font-semibold`}>
                Total
              </th>
              {info.empleados.map((e) => {
                const total = sumar(filas.map((f) => indice[f.clave]?.[e.usuario]));
                return (
                  <Valor
                    key={e.usuario}
                    real={total.real}
                    planificado={total.planificado}
                    terminada={terminada}
                    className="bg-salvia-100"
                    negrita
                  />
                );
              })}
              {(() => {
                const general = sumar(info.celdas);
                return (
                  <Valor
                    real={general.real}
                    planificado={general.planificado}
                    terminada={terminada}
                    className="border-l border-salvia-900/10 bg-salvia-100"
                    negrita
                  />
                );
              })()}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}