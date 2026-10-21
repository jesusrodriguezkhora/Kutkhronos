import { calcularTotales, formatearHoras, superaMaximo } from "./calculo";

// Celdas fijas a izquierda (proyecto) y derecha (total), para que no se pierdan con el scroll horizontal
const FIJA_IZQUIERDA = "sticky left-0 z-10 bg-white";
const FIJA_DERECHA = "sticky right-0 z-10 bg-salvia-50";

function CabeceraEmpleado({ empleado }) {
  return (
    <th className="min-w-[7rem] px-3 py-2 text-right align-bottom font-semibold">
      <div className="leading-tight">{empleado.nombre}</div>
      <div className="text-xs font-normal text-salvia-950/50">
        {empleado.en_plantilla ? `máx. ${formatearHoras(empleado.maximo) || 0} h` : "fuera de plantilla"}
      </div>
    </th>
  );
}

function FilaProyecto({ fila, empleados, indice, total, renderCelda }) {
  return (
    <tr className="hover:bg-salvia/10">
      <th scope="row" className={`${FIJA_IZQUIERDA} max-w-[16rem] px-3 py-2 text-left font-normal`}>
        <div className="font-mono text-sm font-semibold">{fila.name}</div>
        <div className="truncate text-xs text-salvia-950/60" title={fila.descripcion || undefined}>
          {fila.cliente ? `${fila.cliente} · ` : ""}
          {fila.descripcion || "—"}
        </div>
      </th>
      {empleados.map((e) => (
        <td key={e.usuario} className="px-3 py-2 text-right tabular-nums">
          {renderCelda(fila.name, e, indice[fila.name]?.[e.usuario] || 0)}
        </td>
      ))}
      <td className={`${FIJA_DERECHA} px-3 py-2 text-right font-semibold tabular-nums`}>
        {formatearHoras(total)}
      </td>
    </tr>
  );
}

function FilaConcepto({ concepto, empleados, indice, total, renderCelda }) {
  return (
    <tr className="bg-salvia-900/[0.03]">
      <th scope="row" className={`${FIJA_IZQUIERDA} bg-salvia-50 px-3 py-2 text-left font-semibold`}>
        {concepto}
      </th>
      {empleados.map((e) => (
        <td key={e.usuario} className="px-3 py-2 text-right tabular-nums">
          {renderCelda(concepto, e, indice[concepto]?.[e.usuario] || 0)}
        </td>
      ))}
      <td className={`${FIJA_DERECHA} px-3 py-2 text-right font-semibold tabular-nums`}>
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
// renderCelda permite al editor (paso 5b) sustituir el texto por un campo de entrada.
export default function TablaPlanificacion({
  filas,
  conceptos,
  empleados,
  indice,
  renderCelda = celdaLectura,
}) {
  const claves = [...filas.map((f) => f.name), ...conceptos];
  const totales = calcularTotales(indice, claves, empleados);

  if (empleados.length === 0) {
    return (
      <p className="rounded-2xl border border-salvia-900/10 bg-white px-4 py-6 text-sm text-salvia-950/50">
        No hay nadie en la plantilla: hacen falta empleados o coordinadores activos con horas semanales.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-salvia-900/10 bg-white shadow-sm">
      <table className="min-w-full text-sm">
        <thead className="border-b border-salvia-900/10 text-salvia-950/70">
          <tr>
            <th className={`${FIJA_IZQUIERDA} px-3 py-2 text-left align-bottom font-semibold`}>Proyecto</th>
            {empleados.map((e) => (
              <CabeceraEmpleado key={e.usuario} empleado={e} />
            ))}
            <th className={`${FIJA_DERECHA} px-3 py-2 text-right align-bottom font-semibold`}>Total</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-salvia-900/5">
          {filas.length === 0 && (
            <tr>
              <td colSpan={empleados.length + 2} className="px-3 py-4 text-salvia-950/50">
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

        <tfoot className="border-t-2 border-salvia-900/15 font-semibold">
          <tr>
            <th scope="row" className={`${FIJA_IZQUIERDA} px-3 py-2 text-left`}>Total por persona</th>
            {empleados.map((e) => {
              const total = totales.porEmpleado[e.usuario];
              const excede = superaMaximo(total, e.maximo);
              return (
                <td
                  key={e.usuario}
                  className={`px-3 py-2 text-right tabular-nums ${excede ? "bg-red-50 text-red-700" : ""}`}
                  title={excede ? `Supera el máximo de ${formatearHoras(e.maximo)} h` : undefined}
                >
                  {formatearHoras(total) || "0"}
                  {e.maximo != null && (
                    <span className="font-normal text-salvia-950/40"> / {formatearHoras(e.maximo) || 0}</span>
                  )}
                </td>
              );
            })}
            <td className={`${FIJA_DERECHA} px-3 py-2 text-right tabular-nums`}>
              {formatearHoras(totales.general) || "0"}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}