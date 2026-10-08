import { GRID } from "./tabla";
import { formatearImporte } from "../lib/formato";

const ESTILOS_ESTADO = {
  Oportunidad: "border border-black/30 text-black",
  Aceptado: "bg-[#fadc6a] text-black",
  "En curso": "bg-black text-[#fadc6a]",
  Cerrado: "bg-black/10 text-black",
  Rechazado: "border border-black/15 text-black/40 line-through",
};

function Estado({ valor }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
        ESTILOS_ESTADO[valor] || "bg-black/5"
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
      className="grid h-7 w-7 place-items-center rounded-md hover:bg-[#fadc6a]"
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

function BotonDetalle({ onClick, codigo }) {
  return (
    <button
      onClick={onClick}
      title="Ver detalle"
      aria-label={`Ver detalle de ${codigo}`}
      className="grid h-8 w-8 place-items-center rounded-lg border border-black/15 hover:bg-[#fadc6a]"
    >
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
        <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
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

function Fila({ datos, flecha, indicador, esBasado, atenuada, onVerDetalle }) {
  const celda = atenuada ? "opacity-40" : "";

  return (
    <div className={`${GRID} px-4 py-3 text-sm`}>
      <div className="flex justify-center">{flecha}</div>

      <div className={celda}>
        <div
          className={`font-mono font-semibold ${
            esBasado ? "border-l-2 border-[#fadc6a] pl-2" : ""
          }`}
        >
          {datos.name}
        </div>
        {indicador && (
          <div className="mt-0.5 text-xs text-black/50">{indicador}</div>
        )}
      </div>

      <div className={celda}>{datos.cliente || "—"}</div>
      <div className={celda}>{datos.tipo}</div>
      <div className={celda}>{datos.via || "—"}</div>

      <div className={`${celda} text-right tabular-nums`}>
        <div className="font-medium">{formatearImporte(datos.importe)}</div>
        {datos.tipo === "Acuerdo marco" && (
          <div className="text-xs text-black/50">
            Disp. {formatearImporte(datos.importe_disponible)}
          </div>
        )}
      </div>

      <div className={celda}>
        <Estado valor={datos.estado} />
      </div>

      <div className="flex justify-end">
        <BotonDetalle onClick={() => onVerDetalle(datos)} codigo={datos.name} />
      </div>
    </div>
  );
}

export default function FilaProyecto({
  proyecto,
  desplegado,
  onAlternar,
  onVerDetalle,
  onAnadirContratoBasado,
}) {
  const esAcuerdo = proyecto.tipo === "Acuerdo marco";
  const basados = proyecto.contratos_basados ?? [];

  return (
    <div>
      <Fila
        datos={proyecto}
        atenuada={!proyecto.cumple_filtro}
        onVerDetalle={onVerDetalle}
        flecha={
          esAcuerdo ? (
            <BotonFlecha abierto={desplegado} onClick={onAlternar} />
          ) : null
        }
        indicador={esAcuerdo ? textoIndicador(proyecto, basados) : null}
      />

      {esAcuerdo && desplegado && (
        <div className="border-t border-black/10 bg-black/[0.03]">
          {basados.length === 0 ? (
            <p className="py-3 pl-[4.5rem] text-sm text-black/50">
              Sin contratos basados
            </p>
          ) : (
            basados.map((c) => (
              <Fila
                key={c.name}
                datos={c}
                esBasado
                atenuada={!c.cumple_filtro}
                onVerDetalle={onVerDetalle}
              />
            ))
          )}

          <div className="py-3 pl-[4.5rem]">
            <button
              onClick={() => onAnadirContratoBasado(proyecto)}
              className="rounded-lg border border-dashed border-black/30 px-3 py-1.5 text-sm font-medium text-black/70 hover:border-black hover:bg-[#fadc6a] hover:text-black"
            >
              + Añadir contrato basado
            </button>
          </div>
        </div>
      )}
    </div>
  );
}