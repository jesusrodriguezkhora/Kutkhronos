import BotonesAccion from "../componentes/BotonesAccion";
import { GRID } from "./tabla";
import { formatearImporte } from "../lib/formato";

const ESTILOS_ESTADO = {
  Oportunidad: "border border-salvia-900/30 text-salvia-950",
  Aceptado: "bg-salvia text-salvia-950",
  "En curso": "bg-salvia-900 text-salvia-200",
  Cerrado: "bg-salvia-900/10 text-salvia-950",
  Rechazado: "border border-salvia-900/15 text-salvia-950/40 line-through",
};

function Estado({ valor }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
        ESTILOS_ESTADO[valor] || "bg-salvia-900/5"
      }`}
    >
      {valor || "—"}
    </span>
  );
}

function BotonFlecha({ abierto, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-expanded={abierto}
      aria-label={abierto ? "Plegar contratos basados" : "Desplegar contratos basados"}
      className="grid h-7 w-7 place-items-center rounded-md hover:bg-salvia"
    >
      <svg
        viewBox="0 0 20 20"
        fill="currentColor"
        className={`h-4 w-4 transition-transform ${abierto ? "rotate-90" : ""}`}
      >
        <path
          fillRule="evenodd"
          d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
          clipRule="evenodd"
        />
      </svg>
    </button>
  );
}

function textoIndicador(acuerdo, basados) {
  const total = basados.length;
  const coinciden = basados.filter((c) => c.cumple_filtro).length;
  const palabraCoincide = coinciden === 1 ? "coincide" : "coinciden";

  if (!acuerdo.cumple_filtro) return `${coinciden} ${palabraCoincide}`;

  let texto = `${total} ${total === 1 ? "contrato basado" : "contratos basados"}`;
  if (coinciden < total) texto += ` · ${coinciden} ${palabraCoincide}`;
  return texto;
}

function Fila({ datos, flecha, indicador, esBasado, atenuada, acciones }) {
  const celda = atenuada ? "opacity-40" : "";

  return (
    <div className={`${GRID} px-4 py-3 text-sm transition-colors hover:bg-salvia/15`}>
      <div className="flex justify-center">{flecha}</div>

      <div className={celda}>
        <div
          className={`font-mono ${
            esBasado ? "border-l-2 border-salvia pl-2" : ""
          }`}
        >
          {datos.name}
        </div>
        {indicador && (
          <div className="mt-0.5 text-xs text-salvia-950/50">{indicador}</div>
        )}
      </div>

      <div className={celda}>{datos.cliente || "—"}</div>
      <div className={`${celda} line-clamp-2 text-salvia-950/70`} title={datos.descripcion || undefined}>
        {datos.descripcion || "—"}
      </div>
      <div className={celda}>{datos.tipo}</div>
      <div className={celda}>{datos.via || "—"}</div>

      <div className={`${celda} text-right tabular-nums`}>
        <div className="font-medium">{formatearImporte(datos.importe)}</div>
        {datos.tipo === "Acuerdo marco" && (
          <div className="text-xs text-salvia-950/50">
            Disp. {formatearImporte(datos.importe_disponible)}
          </div>
        )}
      </div>

      <div className={celda}>
        <Estado valor={datos.estado} />
      </div>

      <BotonesAccion
        onVer={() => acciones.onVerDetalle(datos)}
        onEditar={() => acciones.onEditar(datos)}
        onEliminar={() => acciones.onEliminar(datos)}
      />
    </div>
  );
}

export default function FilaProyecto({
  proyecto,
  desplegado,
  onAlternar,
  acciones, // { onVerDetalle, onEditar, onEliminar }, se aplican al proyecto y a sus contratos basados
  onAnadirContratoBasado,
}) {
  const esAcuerdo = proyecto.tipo === "Acuerdo marco";
  const basados = proyecto.contratos_basados ?? [];

  return (
    <div>
      <Fila
        datos={proyecto}
        atenuada={!proyecto.cumple_filtro}
        acciones={acciones}
        flecha={
          esAcuerdo ? (
            <BotonFlecha abierto={desplegado} onClick={onAlternar} />
          ) : null
        }
        indicador={esAcuerdo ? textoIndicador(proyecto, basados) : null}
      />

      {esAcuerdo && desplegado && (
        <div className="border-t border-salvia-900/10 bg-salvia-900/[0.03]">
          {basados.length === 0 ? (
            <p className="py-3 pl-[4.5rem] text-sm text-salvia-950/50">
              Sin contratos basados
            </p>
          ) : (
            basados.map((c) => (
              <Fila
                key={c.name}
                datos={c}
                esBasado
                atenuada={!c.cumple_filtro}
                acciones={acciones}
              />
            ))
          )}

          <div className="py-3 pl-[4.5rem]">
            <button
              onClick={() => onAnadirContratoBasado(proyecto)}
              className="rounded-lg border border-dashed border-salvia-900/30 px-3 py-1.5 text-sm font-medium text-salvia-950/70 hover:border-salvia-900 hover:bg-salvia hover:text-salvia-950"
            >
              + Añadir contrato basado
            </button>
          </div>
        </div>
      )}
    </div>
  );
}