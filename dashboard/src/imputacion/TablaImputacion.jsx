import { formatearHoras } from "../planificacion/calculo";
import { MAXIMO_DIARIO, calcularTotales } from "./calculo";

// Mismo estilo que la tabla de planificación
const CELDA = "px-4 py-3";
const CABECERA = "bg-salvia-900 text-xs font-semibold uppercase tracking-wider text-salvia-200";
const FONDO_FILA = "bg-white transition-colors group-hover:bg-salvia-50";
const FONDO_CONCEPTO = "bg-salvia-50 transition-colors group-hover:bg-salvia-100";
const FONDO_BLOQUEADO = "bg-salvia-900/5 text-salvia-950/40";

const diaYMes = (fecha) => `${fecha.slice(8, 10)}/${fecha.slice(5, 7)}`;
const conMayuscula = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1);

// Un día sin imputación posible para la fila: festivo, o vacaciones (salvo en la propia fila de vacaciones)
const bloqueado = (dia, fila) => !!dia.festivo || (!!dia.vacaciones && !fila.soloLectura);

function CabeceraDia({ dia, renderTeletrabajo }) {
  let estado;
  if (dia.festivo) estado = "Festivo";
  else if (dia.vacaciones) estado = "Vacaciones";

  return (
    <th className={`${CELDA} ${CABECERA} min-w-[7rem] text-center align-bottom`} title={dia.festivo || undefined}>
      <div>{conMayuscula(dia.nombre)}</div>
      <div className="font-normal normal-case tracking-normal text-salvia-200/60">{diaYMes(dia.fecha)}</div>
      <div className="mt-2 min-h-[1.5rem] font-normal normal-case tracking-normal">
        {estado ? <span className="text-salvia-200/60">{estado}</span> : renderTeletrabajo(dia)}
      </div>
    </th>
  );
}

function Fila({ fila, dias, indice, total, renderCelda }) {
  const fondo = fila.fija ? FONDO_CONCEPTO : FONDO_FILA;
  return (
    <tr className="group">
      <th scope="row" className={`${CELDA} ${fondo} max-w-[18rem] text-left font-normal`}>
        <div className={fila.fija ? "font-medium" : "font-mono font-medium"}>{fila.titulo}</div>
        {fila.subtitulo && (
          <div className="truncate text-xs text-salvia-950/50" title={fila.subtitulo}>
            {fila.subtitulo}
          </div>
        )}
        <div className="mt-1.5">
          {fila.planificado ? (
            <span className="inline-flex items-baseline gap-1 rounded-md bg-salvia-900/10 px-2 py-0.5 text-sm text-salvia-950">
              Planificado
              <span className="font-bold tabular-nums">{formatearHoras(fila.planificado)} h</span>
            </span>
          ) : (
            <span className="text-xs text-salvia-950/50">Sin planificar</span>
          )}
        </div>
      </th>
      {dias.map((d) => (
        <td
          key={d.fecha}
          className={`${CELDA} text-center tabular-nums ${bloqueado(d, fila) ? FONDO_BLOQUEADO : fondo}`}
        >
          {renderCelda(fila, d, indice[fila.clave]?.[d.fecha] || 0)}
        </td>
      ))}
      <td className={`${CELDA} ${fondo} border-l border-salvia-900/10 text-right font-medium tabular-nums`}>
        {formatearHoras(total)}
      </td>
    </tr>
  );
}

// Valores por defecto: solo lectura
const celdaLectura = (_fila, _dia, horas) => formatearHoras(horas);

// Filas (proyectos, filas fijas, vacaciones) × días de lunes a viernes, con totales sin máximo.
// renderCelda y renderTeletrabajo permiten al editor poner campos en lugar de texto.
export default function TablaImputacion({ filas, dias, indice, teletrabajo, renderCelda = celdaLectura, renderTeletrabajo }) {
  const totales = calcularTotales(indice, filas, dias);
  const teletrabajoLectura = (dia) => (
    <label className="inline-flex items-center gap-1.5 text-salvia-200/80">
      <input type="checkbox" className="h-4 w-4 accent-salvia" checked={teletrabajo.includes(dia.fecha)} disabled readOnly />
      Teletrabajo
    </label>
  );

  return (
    <div className="overflow-x-auto rounded-xl border border-salvia-900/10">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className={`${CELDA} ${CABECERA} text-left align-bottom`}>Proyecto</th>
            {dias.map((d) => (
              <CabeceraDia key={d.fecha} dia={d} renderTeletrabajo={renderTeletrabajo ?? teletrabajoLectura} />
            ))}
            <th className={`${CELDA} ${CABECERA} border-l border-l-white/10 text-right align-bottom`}>Total</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-salvia-900/10">
          {filas.map((f) => (
            <Fila
              key={f.clave}
              fila={f}
              dias={dias}
              indice={indice}
              total={totales.porFila[f.clave]}
              renderCelda={renderCelda}
            />
          ))}
        </tbody>

        <tfoot className="border-t border-salvia-900/15 font-semibold">
          <tr>
            <th scope="row" className={`${CELDA} bg-salvia-100 text-left`}>
              Total por día
            </th>
            {dias.map((d) => {
              const total = totales.porDia[d.fecha];
              const excede = total > MAXIMO_DIARIO + 1e-9;
              return (
                <td
                  key={d.fecha}
                  className={`${CELDA} text-center tabular-nums ${excede ? "bg-red-50 text-red-700" : "bg-salvia-100"}`}
                  title={excede ? `Supera el máximo de ${MAXIMO_DIARIO} h al día` : undefined}
                >
                  {formatearHoras(total) || "0"}
                </td>
              );
            })}
            <td className={`${CELDA} border-l border-salvia-900/10 bg-salvia-100 text-right tabular-nums`}>
              {formatearHoras(totales.general) || "0"}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}