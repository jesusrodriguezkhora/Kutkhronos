import { useState } from "react";
import { useFrappePostCall } from "frappe-react-sdk";
import Modal from "../componentes/Modal";
import { ESTILOS } from "../lib/estilos";
import { mensajeDeError } from "../lib/errores";

const clases = ESTILOS.claro;

const VACIO = {
  nombre: "",
  apellidos: "",
  email: "",
  telefono: "",
  password: "",
  confirmacion: "",
  rol: "Empleado",
};

const ROLES = [
  { valor: "Empleado", descripcion: "Imputa horas en los proyectos." },
  { valor: "Coordinador", descripcion: "Además, gestiona proyectos y empleados." },
];

function SelectorRol({ valor, onChange }) {
  return (
    <fieldset className="sm:col-span-2">
      <legend className={clases.etiqueta}>
        Rol<span className="text-salvia-950"> *</span>
      </legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {ROLES.map((r) => {
          const elegido = valor === r.valor;
          return (
            <label
              key={r.valor}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 transition-colors ${
                elegido
                  ? "border-salvia-700 bg-salvia-100 ring-2 ring-salvia"
                  : "border-salvia-900/15 hover:bg-salvia-50"
              }`}
            >
              <input
                type="radio"
                name="rol"
                value={r.valor}
                checked={elegido}
                onChange={() => onChange(r.valor)}
                className="mt-0.5 accent-salvia-700"
              />
              <span>
                <span className="block text-sm font-semibold">{r.valor}</span>
                <span className="block text-xs text-salvia-950/60">{r.descripcion}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

// Sin caracteres que se confunden al leerlos o dictarlos (I, l, 1, O, 0)
const CARACTERES = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*?";

function generarContrasena(longitud = 14) {
  const aleatorios = crypto.getRandomValues(new Uint32Array(longitud));
  return Array.from(aleatorios, (n) => CARACTERES[n % CARACTERES.length]).join("");
}

function Campo({ etiqueta, obligatorio, ...props }) {
  return (
    <label className="block">
      <span className={clases.etiqueta}>
        {etiqueta}
        {obligatorio && <span className="text-salvia-950"> *</span>}
      </span>
      <input className={clases.campo} {...props} />
    </label>
  );
}

function Copiable({ etiqueta, valor }) {
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(valor);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      window.alert("No se ha podido copiar. Selecciona el texto y cópialo manualmente.");
    }
  };

  return (
    <div>
      <span className={clases.etiqueta}>{etiqueta}</span>
      <div className="flex gap-2">
        <code className="flex-1 break-all rounded-lg bg-salvia-900/5 px-3 py-2 font-mono text-sm">
          {valor}
        </code>
        <button
          type="button"
          onClick={copiar}
          className="w-24 rounded-lg border border-salvia-900/15 text-sm font-medium hover:bg-salvia"
        >
          {copiado ? "Copiado ✓" : "Copiar"}
        </button>
      </div>
    </div>
  );
}

export default function AltaEmpleado({ onCerrar, onCreado }) {
  const [datos, setDatos] = useState(VACIO);
  const [verPassword, setVerPassword] = useState(false);
  const [error, setError] = useState(null);
  const [creado, setCreado] = useState(null); // { email, password } tras crear la cuenta

  const { call, loading } = useFrappePostCall("prototipo.api.empleados.crear_empleado");

  const cambiar = (campo, valor) => setDatos((d) => ({ ...d, [campo]: valor }));

  const coinciden = datos.password === datos.confirmacion;
  const completo = datos.nombre.trim() && datos.email.trim() && datos.password;
  const puedeGuardar = !loading && completo && coinciden;
  const hayCambios = JSON.stringify(datos) !== JSON.stringify(VACIO);

  const cerrar = () => {
    if (!creado && hayCambios && !window.confirm("Hay datos sin guardar. ¿Descartarlos?")) {
      return;
    }
    onCerrar();
  };

  const generar = () => {
    const nueva = generarContrasena();
    setDatos((d) => ({ ...d, password: nueva, confirmacion: nueva }));
    setVerPassword(true);
  };

  const guardar = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await call({
        nombre: datos.nombre,
        apellidos: datos.apellidos,
        email: datos.email,
        password: datos.password,
        telefono: datos.telefono,
        rol: datos.rol,
      });
      setCreado({ email: datos.email.trim().toLowerCase(), password: datos.password });
      onCreado();
    } catch (err) {
      setError(mensajeDeError(err));
    }
  };

  // --- Vista tras crear la cuenta ---
  if (creado) {
    return (
      <Modal titulo="Cuenta creada" onCerrar={onCerrar} ancho="max-w-lg">
        <div className="space-y-5 p-6">
          <p className="text-sm text-salvia-950/70">
            Comunica estos datos de acceso al empleado. Por seguridad, la contraseña{" "}
            <strong className="text-salvia-950">no se volverá a mostrar</strong>.
          </p>
          <Copiable etiqueta="Correo (usuario)" valor={creado.email} />
          <Copiable etiqueta="Contraseña" valor={creado.password} />
        </div>
        <div className="flex justify-end border-t border-salvia-900/10 px-6 py-4">
          <button
            key="hecho"
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

  // --- Formulario de alta ---
  return (
    <Modal titulo="Nuevo empleado" subtitulo={`Se creará una cuenta con el rol ${datos.rol}`} onCerrar={cerrar}>
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
            etiqueta="Correo"
            obligatorio
            type="email"
            autoComplete="off"
            value={datos.email}
            onChange={(e) => cambiar("email", e.target.value)}
          />
          <Campo
            etiqueta="Teléfono"
            type="tel"
            inputMode="tel"
            value={datos.telefono}
            onChange={(e) => cambiar("telefono", e.target.value)}
          />

          <SelectorRol valor={datos.rol} onChange={(v) => cambiar("rol", v)} />

          <div className="border-t border-salvia-900/10 pt-4 sm:col-span-2">
            <h3 className="text-sm font-bold">Contraseña inicial</h3>
            <p className="mt-1 text-xs text-salvia-950/50">
              La defines tú y se la comunicas al empleado.
            </p>
          </div>

          <Campo
            etiqueta="Contraseña"
            obligatorio
            type={verPassword ? "text" : "password"}
            autoComplete="new-password"
            value={datos.password}
            onChange={(e) => cambiar("password", e.target.value)}
          />
          <Campo
            etiqueta="Repite la contraseña"
            obligatorio
            type={verPassword ? "text" : "password"}
            autoComplete="new-password"
            value={datos.confirmacion}
            onChange={(e) => cambiar("confirmacion", e.target.value)}
          />

          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <button
              type="button"
              onClick={() => setVerPassword((v) => !v)}
              className="rounded-lg border border-salvia-900/15 px-3 py-1.5 text-sm font-medium hover:bg-salvia-900/5"
            >
              {verPassword ? "Ocultar" : "Mostrar"}
            </button>
            <button
              type="button"
              onClick={generar}
              className="rounded-lg border border-dashed border-salvia-900/30 px-3 py-1.5 text-sm font-medium hover:border-salvia-900 hover:bg-salvia"
            >
              Generar contraseña segura
            </button>
            {datos.confirmacion && !coinciden && (
              <span className="text-sm text-salvia-950/70">Las contraseñas no coinciden.</span>
            )}
          </div>
        </div>

        {error && (
          <p className="mx-6 mb-2 whitespace-pre-line rounded-lg border-l-4 border-salvia-900 bg-salvia-100 px-3 py-2 text-sm text-salvia-950">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3 border-t border-salvia-900/10 px-6 py-4">
          <button
            key="cancelar"
            type="button"
            onClick={cerrar}
            className="rounded-lg px-4 py-2 text-sm font-medium text-salvia-950/60 hover:bg-salvia-900/5 hover:text-salvia-950"
          >
            Cancelar
          </button>
          <button
            key="crear"
            type="submit"
            disabled={!puedeGuardar}
            className="rounded-lg bg-salvia-900 px-5 py-2 text-sm font-semibold text-salvia-200 hover:bg-salvia hover:text-salvia-950 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? "Creando…" : "Crear cuenta"}
          </button>
        </div>
      </form>
    </Modal>
  );
}