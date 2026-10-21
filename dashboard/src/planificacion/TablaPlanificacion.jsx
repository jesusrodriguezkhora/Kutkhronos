import { calcularTotales, formatearHoras, superaMaximo } from "./calculo";

// Mismo estilo que las tablas del Pipeline, Clientes y Empleados: cabecera salvia-900 en mayúsculas,
// filas blancas separadas por líneas finas y resaltado salvia al pasar el ratón.
const CELDA = "px-4 py-3";
const CABECERA = "bg-salvia-900 text-xs font-semibold uppercase tracking-wider text-salvia-200";

// Columnas fijas a izquierda (proyecto) y derecha (total), para que no se pierdan con el scroll
// horizontal. Necesitan fondo opaco; en las filas, el resaltado del ratón llega vía "group".
const FIJA_IZQUIERDA = "sticky left-0 z-10";
const FIJA_DERECHA = "sticky right-0 z-10 border-l border-salvia-900/10";
const FONDO_FILA = "bg-white transition-colors group-hover:bg-salvia-50";
const FONDO_CONCEPTO = "bg-salvia-50 transition-colors group-hover:bg-salvia-100";

function CabeceraEmpleado({ empleado }) {
  return (
    <th className={`${CELDA} ${CABECERA} min-w-[7.5rem] text-right align-bottom`}>
      <div className="leading-tight">{empleado.nombre}</div>
      <div className="mt-0.5 text-xs font-normal normal-case tracking-normal text-salvia-200/60">
        {empleado.en_plantilla ? `máx. ${formatearHoras(empleado.maximo) || 0} h` : "fuera de plantilla"}
      </div>
    </th>
  );
}

function FilaProyecto({ fila, empleados, indice, total, renderCelda, onQuitar }) {
  return (
    <tr className="group">
      <th scope="row" className={`${CELDA} ${FIJA_IZQUIERDA} ${FONDO_FILA} max-w-[16rem] text-left font-normal`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-mono font-medium">{fila.name}</div>
            <div className="truncate text-xs text-salvia-950/50" title={fila.descripcion || undefined}>
              {fila.cliente ? `${fila.cliente} · ` : ""}
              {fila.descripcion || "—"}
            </div>
          </div>
          {onQuitar && (
            <button
              type="button"
              onClick={onQuitar}
              aria-label={`Quitar ${fila.name} de esta semana`}
              title="Quitar de esta semana"
              className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-salvia-950/40 hover:bg-salvia hover:text-salvia-950"
            >
              ×
            </button>
          )}
        </div>
      </th>
      {empleados.map((e) => (
        <td key={e.usuario} className={`${CELDA} ${FONDO_FILA} text-right tabular-nums`}>
          {renderCelda(fila.name, e, indice[fila.name]?.[e.usuario] || 0)}
        </td>
      ))}
      <td className={`${CELDA} ${FIJA_DERECHA} ${FONDO_FILA} text-right font-medium tabular-nums`}>
        {formatearHoras(total)}
      </td>
    </tr>
  );
}

function FilaConcepto({ concepto, empleados, indice, total, renderCelda }) {
  return (
    <tr className="group">
      <th scope="row" className={`${CELDA} ${FIJA_IZQUIERDA} ${FONDO_CONCEPTO} text-left font-medium`}>
        {concepto}
      </th>
      {empleados.map((e) => (
        <td key={e.usuario} className={`${CELDA} ${FONDO_CONCEPTO} text-right tabular-nums`}>
          {renderCelda(concepto, e, indice[concepto]?.[e.usuario] || 0)}
        </td>
      ))}
      <td className={`${CELDA} ${FIJA_DERECHA} ${FONDO_CONCEPTO} text-right font-medium tabular-nums`}>
        {formatearHoras(total)}
      </td>
    </tr>
  );
}

// Valor de una celda en modo lectura
function celdaLectura(_fila, _empleado, horas) {
  return formatearHoras(horas);
}

// Tabla filas (proyectos + vacaciones + formación) × personas, con totales.
// renderCelda permite al editor sustituir el texto por un campo de entrada; onQuitarFila, quitar proyectos.
export default function TablaPlanificacion({
  filas,
  conceptos,
  empleados,
  indice,
  renderCelda = celdaLectura,
  onQuitarFila,
}) {
  const claves = [...filas.map((f) => f.name), ...conceptos];
  const totales = calcularTotales(indice, claves, empleados);

  if (empleados.length === 0) {
    return (
      <p className="rounded-xl border border-salvia-900/10 bg-white px-4 py-6 text-sm text-salvia-950/50">
        No hay nadie en la plantilla: hacen falta empleados o coordinadores activos con horas semanales.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-salvia-900/10">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className={`${CELDA} ${CABECERA} ${FIJA_IZQUIERDA} text-left align-bottom`}>Proyecto</th>
            {empleados.map((e) => (
              <CabeceraEmpleado key={e.usuario} empleado={e} />
            ))}
            <th className={`${CELDA} ${CABECERA} ${FIJA_DERECHA} border-l-white/10 text-right align-bottom`}>
              Total
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-salvia-900/10">
          {filas.length === 0 && (
            <tr>
              <td colSpan={empleados.length + 2} className="bg-white px-4 py-6 text-sm text-salvia-950/50">
                Esta semana no tiene proyectos planificados.
              </td>
            </tr>
          )}
          {filas.map((f) => (
            <FilaProyecto
              key={f.name}
              fila={f}
              empleados={empleados}
              indice={indice}
              total={totales.porFila[f.name]}
              renderCelda={renderCelda}
              onQuitar={onQuitarFila ? () => onQuitarFila(f.name) : undefined}
            />
          ))}
          {conceptos.map((c) => (
            <FilaConcepto
              key={c}
              concepto={c}
              empleados={empleados}
              indice={indice}
              total={totales.porFila[c]}
              renderCelda={renderCelda}
            />
          ))}
        </tbody>

        <tfoot className="border-t border-salvia-900/15 font-semibold">
          <tr>
            <th scope="row" className={`${CELDA} ${FIJA_IZQUIERDA} bg-salvia-100 text-left`}>
              Total por persona
            </th>
            {empleados.map((e) => {
              const total = totales.porEmpleado[e.usuario];
              const excede = superaMaximo(total, e.maximo);
              return (
                <td
                  key={e.usuario}
                  className={`${CELDA} text-right tabular-nums ${excede ? "bg-red-50 text-red-700" : "bg-salvia-100"}`}
                  title={excede ? `Supera el máximo de ${formatearHoras(e.maximo)} h` : undefined}
                >
                  {formatearHoras(total) || "0"}
                  {e.maximo != null && (
                    <span className="font-normal text-salvia-950/40"> / {formatearHoras(e.maximo) || 0}</span>
                  )}
                </td>
              );
            })}
            <td className={`${CELDA} ${FIJA_DERECHA} bg-salvia-100 text-right tabular-nums`}>
              {formatearHoras(totales.general) || "0"}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}