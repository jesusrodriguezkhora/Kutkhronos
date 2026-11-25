import { useFrappeGetCall } from "frappe-react-sdk";
import { TIPOS, ESTADOS } from "./opciones";
import { ESTILOS } from "../lib/estilos";
import BuscadorCliente from "../componentes/BuscadorCliente";
import CampoImporte from "../componentes/CampoImporte";

const clases = ESTILOS.oscuro;

// Valor del filtro para los proyectos sin responsable (mismo que SIN_RESPONSABLE en api/proyectos.py)
export const SIN_RESPONSABLE = "__sin_responsable__";

// opciones: lista de textos, o de { valor, etiqueta } cuando lo que se envía no es lo que se ve
function Selector({ etiqueta, valor, opciones, onChange }) {
  return (
    <label className="block">
      <span className={clases.etiqueta}>{etiqueta}</span>
      <select className={clases.campo} value={valor} onChange={(e) => onChange(e.target.value)}>
        <option value="">Todos</option>
        {opciones.map((o) => {
          const { valor: v, etiqueta: e } = typeof o === "string" ? { valor: o, etiqueta: o } : o;
          return (
            <option key={v} value={v}>
              {e}
            </option>
          );
        })}
      </select>
    </label>
  );
}

export default function Filtros({ filtros, onCambiar, onLimpiar }) {
  // Posibles responsables (coordinadores y CEO activos): la misma lista que el formulario del proyecto
  const { data } = useFrappeGetCall("prototipo.api.responsables.listar_responsables");
  const responsables = [
    { valor: SIN_RESPONSABLE, etiqueta: "Sin responsable" },
    ...(data?.message ?? []).map((u) => ({ valor: u.name, etiqueta: u.full_name || u.name })),
  ];

  return (
    <div className="mb-6 rounded-xl bg-salvia-900 p-5">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
        <BuscadorCliente
          valor={filtros.cliente}
          onChange={(v) => onCambiar("cliente", v)}
          clases={clases}
        />
        <Selector etiqueta="Tipo" valor={filtros.tipo} opciones={TIPOS} onChange={(v) => onCambiar("tipo", v)} />
        <Selector etiqueta="Estado" valor={filtros.estado} opciones={ESTADOS} onChange={(v) => onCambiar("estado", v)} />
        <Selector
          etiqueta="Responsable"
          valor={filtros.responsable}
          opciones={responsables}
          onChange={(v) => onCambiar("responsable", v)}
        />
        <CampoImporte
          etiqueta="Importe mín."
          valor={filtros.importe_min}
          onChange={(v) => onCambiar("importe_min", v)}
          clases={clases}
        />
        <CampoImporte
          etiqueta="Importe máx."
          valor={filtros.importe_max}
          onChange={(v) => onCambiar("importe_max", v)}
          clases={clases}
        />
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={onLimpiar}
          className="text-sm font-medium text-white/60 underline-offset-4 hover:text-salvia-200 hover:underline"
        >
          Limpiar filtros
        </button>
      </div>
    </div>
  );
}