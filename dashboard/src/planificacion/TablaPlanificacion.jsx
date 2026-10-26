import { calcularTotales, formatearHoras, superaMaximo } from "./calculo"
import { useState } from "react";

// Mismo estilo que las tablas del Pipeline, Clientes y Empleados: cabecera salvia-900 en mayúsculas,
// filas blancas separadas por líneas finas y resaltado salvia al pasar el ratón.
const CELDA = "px-4 py-3";
const CABECERA = "bg-salvia-900 text-xs font-semibold uppercase tracking-wider text-salvia-200";
// Cabecera y total de cada persona: a la derecha, el relleno normal (1rem) más el hueco del bocadillo
// (1,5rem + 0,25rem de separación). Así se centran sobre el campo de horas, no sobre campo + bocadillo.
const CELDA_PERSONA = "py-3 pl-4 pr-11";

// Columnas fijas a izquierda (proyecto) y derecha (total), para que no se pierdan con el scroll
// horizontal. Necesitan fondo opaco; en las filas, el resaltado del ratón llega vía "group".
const FIJA_IZQUIERDA = "sticky left-0 z-10";
const FIJA_DERECHA = "sticky right-0 z-10 border-l border-salvia-900/10";
const FONDO_FILA = "bg-white transition-colors group-hover:bg-salvia-50";
const FONDO_CONCEPTO = "bg-salvia-50 transition-colors group-hover:bg-salvia-100";

// Cabecera fija al hacer scroll vertical dentro de la tabla. Las esquinas (Proyecto y Total) están
// fijas arriba y a un lado, y van por encima de todo.
const FIJA_ARRIBA = "sticky top-0 z-20";
const ESQUINA_IZQUIERDA = "sticky left-0 top-0 z-30";
const ESQUINA_DERECHA = "sticky right-0 top-0 z-30 border-l border-l-white/10";

// Texto sin tildes y en minúsculas, para buscar sin importar cómo se escriba
const normalizar = (texto) =>
  (texto || "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

// ¿La fila de proyecto coincide con la búsqueda? (código, cliente o descripción)
function coincide(fila, busqueda) {
  const buscado = normalizar(busqueda.trim());
  return !buscado || [fila.name, fila.cliente, fila.descripcion].some((campo) => normalizar(campo).includes(buscado));
}

function CabeceraEmpleado({ empleado }) {
  return (
    <th className={`${CELDA_PERSONA} ${CABECERA} ${FIJA_ARRIBA} min-w-[9rem] text-center align-bottom`}>
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
            <div className="font-medium">{fila.descripcion || "—"}</div>
            <div className="truncate text-xs text-salvia-950/50" title={fila.descripcion || undefined}>
              {fila.cliente ? `${fila.cliente} · ` : ""}
              {fila.name}
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
        <td key={e.usuario} className={`${CELDA} ${FONDO_FILA} text-center tabular-nums`}>
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
        <td key={e.usuario} className={`${CELDA} ${FONDO_CONCEPTO} text-center tabular-nums`}>
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

// Tabla filas (proyectos + filas fijas) × personas, con totales.
// renderCelda permite al editor sustituir el texto por un campo de entrada. onQuitarFila es opcional
// (planificación ya no lo usa; se mantiene para el módulo de imputación).
export default function TablaPlanificacion({
  filas,
  conceptos,
  empleados,
  indice,
  renderCelda = celdaLectura,
  onQuitarFila,
}) {
  const [busqueda, setBusqueda] = useState("");
  const claves = [...filas.map((f) => f.name), ...conceptos];
  const totales = calcularTotales(indice, claves, empleados);
  // Se filtra después de calcular los totales: los totales siempre son de todos los proyectos
  const visibles = filas.filter((f) => coincide(f, busqueda));

  if (empleados.length === 0) {
    return (
      <p className="rounded-xl border border-salvia-900/10 bg-white px-4 py-6 text-sm text-salvia-950/50">
        No hay nadie en la plantilla: hacen falta empleados o coordinadores activos con horas semanales.
      </p>
    );
  }

  return (
    <div className="max-h-[70vh] overflow-auto rounded-xl border border-salvia-900/10">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className={`${CELDA} ${CABECERA} ${ESQUINA_IZQUIERDA} text-left align-bottom`}>
              <div>Proyecto</div>
              <input
                type="search"
                value={busqueda}
                onChange={(ev) => setBusqueda(ev.target.value)}
                onKeyDown={(ev) => ev.key === "Escape" && setBusqueda("")}
                placeholder="Buscar código, cliente…"
                aria-label="Buscar proyecto"
                className="mt-2 w-full min-w-[12rem] rounded-md border border-white/15 bg-white/10 px-2 py-1 text-sm font-normal normal-case tracking-normal text-salvia-100 outline-none placeholder:text-salvia-200/50 focus:border-salvia-200 focus:ring-1 focus:ring-salvia-200"
              />
            </th>
            {empleados.map((e) => (
              <CabeceraEmpleado key={e.usuario} empleado={e} />
            ))}
              <th className={`${CELDA} ${CABECERA} ${ESQUINA_DERECHA} text-right align-bottom`}>
              Total
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-salvia-900/10">
          {filas.length === 0 && (
            <tr>
              <td colSpan={empleados.length + 2} className="bg-white px-4 py-6 text-sm text-salvia-950/50">
                No hay proyectos que mostrar en esta semana.
                 {filas.length > 0 && visibles.length === 0 && (
            <tr>
              <td colSpan={empleados.length + 2} className="bg-white px-4 py-6 text-sm text-salvia-950/50">
                Ningún proyecto coincide con «{busqueda.trim()}».
              </td>
            </tr>
          )}
              </td>
            </tr>
          )}
          {visibles.map((f) => (
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
                  className={`${CELDA_PERSONA} text-center tabular-nums ${excede ? "bg-red-50 text-red-700" : "bg-salvia-100"}`}
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