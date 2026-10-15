import { useState } from "react";
import { useFrappePostCall } from "frappe-react-sdk";
import Modal from "./Modal";
import { mensajeDeError } from "../lib/errores";

// Confirmación antes de borrar un registro. `children` describe qué se borra;
// al confirmar se llama a `metodo` (método de la API) con `argumentos`.
export default function ConfirmarEliminacion({
  titulo,
  metodo,
  argumentos,
  onCerrar,
  onEliminado,
  children,
}) {
  const [error, setError] = useState(null);
  const { call, loading } = useFrappePostCall(metodo);

  const eliminar = async () => {
    setError(null);
    try {
      await call(argumentos);
      onEliminado();
      onCerrar();
    } catch (err) {
      setError(mensajeDeError(err));
    }
  };

  return (
    <Modal titulo={titulo} onCerrar={onCerrar} ancho="max-w-lg">
      <div className="space-y-3 p-6 text-sm text-salvia-950/70">
        <p>{children}</p>
        <p>
          Esta acción <strong className="text-salvia-950">no se puede deshacer</strong>.
        </p>
      </div>

      {error && (
        <p className="mx-6 mb-2 whitespace-pre-line rounded-lg border-l-4 border-salvia-900 bg-salvia-100 px-3 py-2 text-sm text-salvia-950">
          {error}
        </p>
      )}

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
          className="rounded-lg bg-red-700 px-5 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "Eliminando…" : "Eliminar"}
        </button>
      </div>
    </Modal>
  );
}
