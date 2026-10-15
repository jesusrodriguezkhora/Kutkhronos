import { useMemo, useState } from "react";
import { useFrappePostCall } from "frappe-react-sdk";
import Modal from "../componentes/Modal";
import AreaTexto from "../componentes/AreaTexto";
import { ESTILOS } from "../lib/estilos";
import { mensajeDeError } from "../lib/errores";
import { normalizar } from "../lib/texto";
import { useDebounced } from "../hooks/useDebounced";
import { clientesParecidos } from "./similares";

const clases = ESTILOS.claro;

// Alta (cliente = null) y edición de un cliente. `clientes` es la lista ya cargada en la página,
// con la que se avisa de clientes parecidos mientras se escribe el nombre.
export default function FormularioCliente({ cliente, clientes, onCerrar, onGuardado }) {
  const editando = Boolean(cliente);
  const [inicial] = useState(() => ({
    nombre: cliente?.customer_name ?? "",
    descripcion: cliente?.customer_details ?? "",
  }));
  const [datos, setDatos] = useState(inicial);
  const [error, setError] = useState(null);

  const { call, loading } = useFrappePostCall(
    editando ? "prototipo.api.clientes.modificar_cliente" : "prototipo.api.clientes.crear_cliente"
  );

  const cambiar = (campo, valor) => setDatos((d) => ({ ...d, [campo]: valor }));

  const nombre = useDebounced(datos.nombre, 200);
  const parecidos = useMemo(
    () => clientesParecidos(nombre, clientes, { excepto: cliente?.name }),
    [nombre, clientes, cliente]
  );
  // El servidor rechaza los nombres repetidos; aquí se avisa antes de enviar
  const repetido = parecidos.find(
    (c) => normalizar(c.customer_name).trim() === normalizar(datos.nombre).trim()
  );

  const hayCambios = JSON.stringify(datos) !== JSON.stringify(inicial);
  const puedeGuardar = !loading && hayCambios && datos.nombre.trim() && !repetido;

  const cerrar = () => {
    if (hayCambios && !window.confirm("Hay cambios sin guardar. ¿Descartarlos?")) {
      return;
    }
    onCerrar();
  };

  const guardar = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await call({
        ...(editando && { cliente: cliente.name }),
        nombre: datos.nombre,
        descripcion: datos.descripcion,
      });
      onGuardado();
      onCerrar();
    } catch (err) {
      setError(mensajeDeError(err));
    }
  };

  return (
    <Modal
      titulo={editando ? "Editar cliente" : "Nuevo cliente"}
      subtitulo={editando ? cliente.customer_name : undefined}
      onCerrar={cerrar}
    >
      <form onSubmit={guardar} className="flex min-h-0 flex-col">
        <div className="space-y-5 overflow-y-auto p-6">
          <div>
            <label className="block">
              <span className={clases.etiqueta}>
                Nombre<span className="text-salvia-950"> *</span>
              </span>
              <input
                className={clases.campo}
                autoFocus
                autoComplete="off"
                value={datos.nombre}
                onChange={(e) => cambiar("nombre", e.target.value)}
              />
            </label>

            {parecidos.length > 0 && (
              <div className="mt-2 rounded-lg border-l-4 border-salvia-900 bg-salvia-100 px-3 py-2 text-sm">
                <p className="font-semibold">
                  {repetido
                    ? "Ya existe un cliente con este nombre."
                    : "Ya hay clientes parecidos. Comprueba que no sea uno de ellos:"}
                </p>
                <ul className="mt-1 space-y-0.5">
                  {parecidos.map((c) => (
                    <li key={c.name} className="text-salvia-950/80">
                      {c.customer_name}
                      {c.customer_details && (
                        <span className="text-salvia-950/50"> — {c.customer_details}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <AreaTexto
            etiqueta="Descripción"
            valor={datos.descripcion}
            onChange={(v) => cambiar("descripcion", v)}
            clases={clases}
            placeholder="Opcional"
          />
        </div>

        {error && (
          <p className="mx-6 mb-2 whitespace-pre-line rounded-lg border-l-4 border-salvia-900 bg-salvia-100 px-3 py-2 text-sm text-salvia-950">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3 border-t border-salvia-900/10 px-6 py-4">
          <button
            type="button"
            onClick={cerrar}
            className="rounded-lg px-4 py-2 text-sm font-medium text-salvia-950/60 hover:bg-salvia-900/5 hover:text-salvia-950"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!puedeGuardar}
            className="rounded-lg bg-salvia-900 px-5 py-2 text-sm font-semibold text-salvia-200 hover:bg-salvia hover:text-salvia-950 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? "Guardando…" : editando ? "Guardar cambios" : "Crear cliente"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
