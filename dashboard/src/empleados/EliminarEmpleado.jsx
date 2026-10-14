import { useState } from "react";
import { useFrappePostCall } from "frappe-react-sdk";
import Modal from "../componentes/Modal";
import { mensajeDeError } from "../lib/errores";

// Confirmación antes de borrar definitivamente una cuenta
export default function EliminarEmpleado({ empleado, onCerrar, onEliminado }) {
  const [error, setError] = useState(null);
  const { call, loading } = useFrappePostCall("prototipo.api.empleados.eliminar_empleado");

  const eliminar = async () => {
    setError(null);
    try {
      await call({ usuario: empleado.name });
      onEliminado();
      onCerrar();
    } catch (err) {
      setError(mensajeDeError(err));
    }
  };

  return (
    <Modal titulo="Eliminar empleado" onCerrar={onCerrar} ancho="max-w-md">
      <div className="space-y-4 p-6 text-sm">
        <p className="text-salvia-950/80">
          ¿Seguro que quieres eliminar la cuenta de{" "}
          <strong className="text-salvia-950">{empleado.full_name}</strong> ({empleado.email})?
        </p>
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700">
          Esta acción no se puede deshacer. La persona dejará de poder iniciar sesión.
        </p>
        {error && (
          <p className="whitespace-pre-line rounded-lg border-l-4 border-salvia-900 bg-salvia-100 px-3 py-2 text-salvia-950">
            {error}
          </p>
        )}
      </div>

      <div className="flex justify-end gap-3 border-t border-salvia-900/10 px-6 py-4">
        <button
          type="button"
          onClick={onCerrar}
          className="rounded-lg px-4 py-2 text-sm font-medium text-salvia-950/60 hover:bg-salvia-900/5 hover:text-salvia-950"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={eliminar}
          disabled={loading}
          className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-wait disabled:opacity-60"
        >
          {loading ? "Eliminando…" : "Eliminar"}
        </button>
      </div>
    </Modal>
  );
}
