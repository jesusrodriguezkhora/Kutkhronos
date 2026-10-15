import { GRID } from "./tabla";
import { formatearFecha } from "../lib/formato";

export default function FilaCliente({ cliente, onEditar, onEliminar }) {
  return (
    <div className={`${GRID} px-4 py-3 text-sm transition-colors hover:bg-salvia/15`}>
      <div className="font-medium">{cliente.customer_name}</div>

      <div className="line-clamp-2 text-salvia-950/70">
        {cliente.customer_details || <span className="text-salvia-950/30">—</span>}
      </div>

      <div className="tabular-nums text-salvia-950/70">
        {formatearFecha(cliente.creation?.slice(0, 10))}
      </div>

      <div className="flex justify-end gap-1">
        <button
          type="button"
          onClick={() => onEditar(cliente)}
          className="rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-salvia-900/5"
        >
          Editar
        </button>
        <button
          type="button"
          onClick={() => onEliminar(cliente)}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}
