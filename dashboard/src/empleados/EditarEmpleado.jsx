import { useState } from "react";
import { useFrappePostCall } from "frappe-react-sdk";
import Modal from "../componentes/Modal";
import { mensajeDeError } from "../lib/errores";
import { Campo, Copiable, SelectorRol } from "./campos";
import { clases, generarContrasena } from "./formulario";

function datosIniciales(empleado) {
  return {
    nombre: empleado.first_name || "",
    apellidos: empleado.last_name || "",
    telefono: empleado.mobile_no || "",
    rol: empleado.rol,
    activo: Boolean(empleado.enabled),
    password: "",
  };
}

export default function EditarEmpleado({ empleado, roles, onCerrar, onGuardado }) {
  const [inicial] = useState(() => datosIniciales(empleado));
  const [datos, setDatos] = useState(inicial);
  const [verPassword, setVerPassword] = useState(false);
  const [error, setError] = useState(null);
  const [nuevaPassword, setNuevaPassword] = useState(null); // se muestra tras guardar si se cambió

  const { call, loading } = useFrappePostCall("prototipo.api.empleados.modificar_empleado");

  const cambiar = (campo, valor) => setDatos((d) => ({ ...d, [campo]: valor }));

  const hayCambios = JSON.stringify(datos) !== JSON.stringify(inicial);
  const puedeGuardar = !loading && hayCambios && datos.nombre.trim();

  const cerrar = () => {
    if (hayCambios && !window.confirm("Hay cambios sin guardar. ¿Descartarlos?")) {
      return;
    }
    onCerrar();
  };

  const generar = () => {
    cambiar("password", generarContrasena());
    setVerPassword(true);
  };

  const guardar = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await call({
        usuario: empleado.name,
        nombre: datos.nombre,
        apellidos: datos.apellidos,
        telefono: datos.telefono,
        rol: datos.rol,
        activo: datos.activo ? 1 : 0,
        password: datos.password || null,
      });
      onGuardado();
      if (datos.password) {
        setNuevaPassword(datos.password);
      } else {
        onCerrar();
      }
    } catch (err) {
      setError(mensajeDeError(err));
    }
  };

  // --- Vista tras cambiar la contraseña ---
  if (nuevaPassword) {
    return (
      <Modal titulo="Cambios guardados" onCerrar={onCerrar} ancho="max-w-lg">
        <div className="space-y-5 p-6">
          <p className="text-sm text-salvia-950/70">
            Comunica la nueva contraseña al empleado. Por seguridad,{" "}
            <strong className="text-salvia-950">no se volverá a mostrar</strong>.
          </p>
          <Copiable etiqueta="Correo (usuario)" valor={empleado.email} />
          <Copiable etiqueta="Nueva contraseña" valor={nuevaPassword} />
        </div>
        <div className="flex justify-end border-t border-salvia-900/10 px-6 py-4">
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-lg bg-salvia-900 px-5 py-2 text-sm font-semibold text-salvia-200 hover:bg-salvia hover:text-salvia-950"
          >
            Hecho
          </button>
        </div>
      </Modal>
    );
  }

  // --- Formulario de edición ---
  return (
    <Modal titulo="Editar cuenta" subtitulo={empleado.email} onCerrar={cerrar}>
      <form onSubmit={guardar} className="flex min-h-0 flex-col">
        <div className="grid gap-5 overflow-y-auto p-6 sm:grid-cols-2">
          <Campo
            etiqueta="Nombre"
            obligatorio
            value={datos.nombre}
            onChange={(e) => cambiar("nombre", e.target.value)}
          />
          <Campo
            etiqueta="Apellidos"
            value={datos.apellidos}
            onChange={(e) => cambiar("apellidos", e.target.value)}
          />
          <Campo
            etiqueta="Teléfono"
            type="tel"
            inputMode="tel"
            value={datos.telefono}
            onChange={(e) => cambiar("telefono", e.target.value)}
          />

          <div>
            <span className={clases.etiqueta}>Estado</span>
            <label className="flex h-[38px] items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 accent-salvia-900"
                checked={datos.activo}
                onChange={(e) => cambiar("activo", e.target.checked)}
              />
              Cuenta activa (puede iniciar sesión)
            </label>
          </div>

          <div className="sm:col-span-2">
            <SelectorRol roles={roles} valor={datos.rol} onCambiar={(rol) => cambiar("rol", rol)} />
          </div>

          <div className="border-t border-salvia-900/10 pt-4 sm:col-span-2">
            <h3 className="text-sm font-bold">Cambiar contraseña</h3>
            <p className="mt-1 text-xs text-salvia-950/50">
              Déjalo vacío para mantener la contraseña actual.
            </p>
          </div>

          <Campo
            etiqueta="Nueva contraseña"
            type={verPassword ? "text" : "password"}
            autoComplete="new-password"
            value={datos.password}
            onChange={(e) => cambiar("password", e.target.value)}
          />
          <div className="flex items-end gap-3">
            <button
              type="button"
              onClick={() => setVerPassword((v) => !v)}
              className="rounded-lg border border-salvia-900/15 px-3 py-2 text-sm font-medium hover:bg-salvia-900/5"
            >
              {verPassword ? "Ocultar" : "Mostrar"}
            </button>
            <button
              type="button"
              onClick={generar}
              className="rounded-lg border border-dashed border-salvia-900/30 px-3 py-2 text-sm font-medium hover:border-salvia-900 hover:bg-salvia"
            >
              Generar
            </button>
          </div>
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
            {loading ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
