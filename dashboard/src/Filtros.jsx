import { TIPOS, VIAS, ESTADOS } from "./opciones";
import BuscadorCliente from "./BuscadorCliente";

const CAMPO =
  "w-full rounded-lg border border-white/10 bg-white px-3 py-2 text-sm text-black outline-none focus:ring-2 focus:ring-[#fadc6a]";

const ETIQUETA =
  "mb-1 block text-xs font-semibold uppercase tracking-wider text-[#fadc6a]";

const miles = new Intl.NumberFormat("es-ES", { useGrouping: "always" });

function Selector({ etiqueta, valor, opciones, onChange }) {
  return (
    <label className="block">
      <span className={ETIQUETA}>{etiqueta}</span>
      <select className={CAMPO} value={valor} onChange={(e) => onChange(e.target.value)}>
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

function CampoImporte({ etiqueta, valor, onChange }) {
  const mostrado = valor === "" ? "" : miles.format(Number(valor));

  return (
    <label className="block">
      <span className={ETIQUETA}>{etiqueta}</span>
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          className={`${CAMPO} pr-8 text-right tabular-nums`}
          value={mostrado}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-black/40">
          €
        </span>
      </div>
    </label>
  );
}

export default function Filtros({ filtros, onCambiar, onLimpiar }) {
  return (
    <div className="mb-6 rounded-xl bg-black p-5">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <BuscadorCliente
          valor={filtros.cliente}
          onChange={(v) => onCambiar("cliente", v)}
          claseCampo={CAMPO}
          claseEtiqueta={ETIQUETA}
        />
        <Selector
          etiqueta="Tipo"
          valor={filtros.tipo}
          opciones={TIPOS}
          onChange={(v) => onCambiar("tipo", v)}
        />
        <Selector
          etiqueta="Vía"
          valor={filtros.via}
          opciones={VIAS}
          onChange={(v) => onCambiar("via", v)}
        />
        <Selector
          etiqueta="Estado"
          valor={filtros.estado}
          opciones={ESTADOS}
          onChange={(v) => onCambiar("estado", v)}
        />
        <CampoImporte
          etiqueta="Importe mín."
          valor={filtros.importe_min}
          onChange={(v) => onCambiar("importe_min", v)}
        />
        <CampoImporte
          etiqueta="Importe máx."
          valor={filtros.importe_max}
          onChange={(v) => onCambiar("importe_max", v)}
        />
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={onLimpiar}
          className="text-sm font-medium text-white/60 underline-offset-4 hover:text-[#fadc6a] hover:underline"
        >
          Limpiar filtros
        </button>
      </div>
    </div>
  );
}