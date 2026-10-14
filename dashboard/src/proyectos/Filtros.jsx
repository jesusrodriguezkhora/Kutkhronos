import { TIPOS, VIAS, ESTADOS } from "./opciones";
import { ESTILOS } from "../lib/estilos";
import BuscadorCliente from "../componentes/BuscadorCliente";
import CampoImporte from "../componentes/CampoImporte";

const clases = ESTILOS.oscuro;

function Selector({ etiqueta, valor, opciones, onChange }) {
  return (
    <label className="block">
      <span className={clases.etiqueta}>{etiqueta}</span>
      <select className={clases.campo} value={valor} onChange={(e) => onChange(e.target.value)}>
        <option value="">Todos</option>
        {opciones.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function Filtros({ filtros, onCambiar, onLimpiar }) {
  return (
    <div className="mb-6 rounded-xl bg-salvia-900 p-5">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <BuscadorCliente
          valor={filtros.cliente}
          onChange={(v) => onCambiar("cliente", v)}
          clases={clases}
        />
        <Selector etiqueta="Tipo" valor={filtros.tipo} opciones={TIPOS} onChange={(v) => onCambiar("tipo", v)} />
        <Selector etiqueta="Vía" valor={filtros.via} opciones={VIAS} onChange={(v) => onCambiar("via", v)} />
        <Selector etiqueta="Estado" valor={filtros.estado} opciones={ESTADOS} onChange={(v) => onCambiar("estado", v)} />
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