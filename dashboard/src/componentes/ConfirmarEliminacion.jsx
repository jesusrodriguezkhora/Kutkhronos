import { useState } from "react";
import { useFrappePostCall } from "frappe-react-sdk";
import Modal from "./Modal";
import { ESTILOS } from "../lib/estilos";
import { mensajeDeError } from "../lib/errores";

// Confirmación antes de borrar un registro. `children` describe qué se borra;
// al confirmar se llama a `metodo` (método de la API) con `argumentos`.
// Con `textoConfirmacion` (p. ej. el código de un proyecto), hay que escribirlo para poder borrar,
// y lo escrito se envía también al servidor como `confirmacion`.
export default function ConfirmarEliminacion({
  titulo,
  metodo,
  argumentos,
  textoConfirmacion,
  onCerrar,
  onEliminado,
  children,
}) {
  const [error, setError] = useState(null);
  const [escrito, setEscrito] = useState("");
  const { call, loading } = useFrappePostCall(metodo);

  const pideTexto = !!textoConfirmacion;
  const coincide = !pideTexto || escrito.trim().toUpperCase() === textoConfirmacion.toUpperCase();

  const eliminar = async () => {
    if (!coincide || loading) return;
    setError(null);
    try {
      await call(pideTexto ? { ...argumentos, confirmacion: escrito } : argumentos);
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

        {pideTexto && (
          <label className="block pt-2">
            <span className="mb-1.5 block text-salvia-950">
              Escribe <strong className="font-mono">{textoConfirmacion}</strong> para confirmar:
            </span>
            <input
              type="text"
              autoFocus
              autoComplete="off"
              spellCheck={false}
              className={`${ESTILOS.claro.campo} font-mono`}
              value={escrito}
              onChange={(e) => setEscrito(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && eliminar()}
              aria-label={`Escribe ${textoConfirmacion} para confirmar`}
            />
          </label>
        )}
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
          disabled={loading || !coincide}
          className="rounded-lg bg-red-700 px-5 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "Eliminando…" : "Eliminar"}
        </button>
      </div>
    </Modal>
  );
}