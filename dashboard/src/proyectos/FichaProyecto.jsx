import { useEffect, useState } from "react";
import { useFrappeCreateDoc, useFrappeGetCall, useFrappeUpdateDoc } from "frappe-react-sdk";
import { TIPOS_SUELTOS, VIAS_NO_SUBVENCION, ESTADOS } from "./opciones";
import { ESTILOS } from "../lib/estilos";
import { mensajeDeError } from "../lib/errores";
import { formatearImporte, formatearFecha } from "../lib/formato";
import BuscadorCliente from "../componentes/BuscadorCliente";
import CampoImporte from "../componentes/CampoImporte";
import AreaTexto from "../componentes/AreaTexto";
import Propuesta from "./Propuesta";

const clases = ESTILOS.claro;

// Valores del formulario a partir de un proyecto existente o de un acuerdo marco (nuevo contrato basado)
function valoresIniciales(proyecto, acuerdoMarco) {
  const esNuevoBasado = !proyecto && !!acuerdoMarco;
  return {
    tipo: proyecto?.tipo ?? (esNuevoBasado ? "Contrato basado" : ""),
    cliente: proyecto?.cliente ?? acuerdoMarco?.cliente ?? "",
    via: proyecto?.via ?? (esNuevoBasado ? "Heredada" : ""),
    importe: proyecto?.importe ?? "",
    estado: proyecto?.estado ?? "Oportunidad",
    descripcion: proyecto?.descripcion ?? "",
    fecha_fin: proyecto?.fecha_fin ?? "",
    responsable: proyecto?.responsable ?? "",
    lider_proyecto: proyecto?.lider_proyecto ?? "",
    miembros_consorcio: proyecto?.miembros_consorcio ?? "",
  };
}

// Pestañas bajo la cabecera. La propuesta solo existe para proyectos ya guardados.
const PESTANAS = [
  { clave: "datos", etiqueta: "Datos" },
  { clave: "propuesta", etiqueta: "Propuesta" },
];

function Pestanas({ activa, onCambiar, propuestaDisponible }) {
  return (
    <div role="tablist" className="grid grid-cols-2 border-b border-salvia-900/10">
      {PESTANAS.map(({ clave, etiqueta }) => {
        const deshabilitada = clave === "propuesta" && !propuestaDisponible;
        const activo = activa === clave;
        return (
          <button
            key={clave}
            type="button"
            role="tab"
            aria-selected={activo}
            disabled={deshabilitada}
            title={deshabilitada ? "Guarda el proyecto para preparar su propuesta" : undefined}
            onClick={() => onCambiar(clave)}
            className={`-mb-px border-b-2 py-3 text-sm font-semibold uppercase tracking-wider transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              activo
                ? "border-salvia-900 text-salvia-950"
                : "border-transparent text-salvia-950/50 hover:text-salvia-950"
            }`}
          >
            {etiqueta}
          </button>
        );
      })}
    </div>
  );
}

// --- Piezas del modo detalle ---

function Dato({ etiqueta, children, ancho }) {
  return (
    <div className={ancho ? "sm:col-span-2" : ""}>
      <dt className={clases.etiqueta}>{etiqueta}</dt>
      <dd className="whitespace-pre-line text-sm text-salvia-950">{children || "—"}</dd>
    </div>
  );
}

function TituloSeccion({ children }) {
  return (
    <h3 className="border-t border-salvia-900/10 pt-4 text-sm font-bold sm:col-span-2">{children}</h3>
  );
}

// --- Piezas del modo edición ---

function Selector({ etiqueta, valor, opciones, onChange, vacio }) {
  return (
    <label className="block">
      <span className={clases.etiqueta}>{etiqueta}</span>
      <select className={clases.campo} value={valor} onChange={(e) => onChange(e.target.value)}>
        {vacio && <option value="">{vacio}</option>}
        {opciones.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

// Responsable: empleados y coordinadores activos. Si el actual ya no lo es (p. ej., se dio de baja),
// se mantiene como opción para que no se pierda al guardar otros cambios.
function SelectorResponsable({ valor, opciones, nombreActual, onChange }) {
  const lista = [...opciones];
  if (valor && !lista.some((u) => u.name === valor)) {
    lista.unshift({ name: valor, full_name: nombreActual || valor });
  }
  return (
    <label className="block">
      <span className={clases.etiqueta}>Responsable</span>
      <select className={clases.campo} value={valor} onChange={(e) => onChange(e.target.value)}>
        <option value="">Sin responsable</option>
        {lista.map((u) => (
          <option key={u.name} value={u.name}>
            {u.full_name || u.name}
          </option>
        ))}
      </select>
    </label>
  );
}

// Campo que no se puede modificar en edición (heredado, fijo o "Set Only Once")
function CampoLectura({ etiqueta, valor }) {
  return (
    <div>
      <span className={clases.etiqueta}>{etiqueta}</span>
      <div className="w-full cursor-not-allowed rounded-lg border border-salvia-900/10 bg-salvia-900/5 px-3 py-2 text-sm text-salvia-950/60">
        {valor || "—"}
      </div>
    </div>
  );
}

// Modos según las props:
//   - detalle de un proyecto: con proyecto (empieza en modo detalle; botón Editar),
//     o directamente en edición con editarAlAbrir (botón Editar de la tabla)
//   - nuevo proyecto:         sin proyecto ni acuerdoMarco (empieza en edición)
//   - nuevo contrato basado:  con acuerdoMarco (empieza en edición)
// Al guardar (alta o edición) se llama a onGuardado, que cierra la ficha y recarga la lista.
export default function FichaProyecto({
  proyecto,
  acuerdoMarco,
  editarAlAbrir = false,
  onCerrar,
  onGuardado,
}) {
  const esNuevo = !proyecto;
  const esNuevoBasado = esNuevo && !!acuerdoMarco;
  const esBasado = esNuevoBasado || !!proyecto?.acuerdo_marco;

  const [editando, setEditando] = useState(esNuevo || editarAlAbrir);
  const [datos, setDatos] = useState(() => valoresIniciales(proyecto, acuerdoMarco));
  const [error, setError] = useState(null);
  const [pestana, setPestana] = useState("datos");

  const { createDoc, loading: creando } = useFrappeCreateDoc();
  const { updateDoc, loading: actualizando } = useFrappeUpdateDoc();
  const guardando = creando || actualizando;

    // Posibles responsables para el selector. Solo se piden al editar (null = no lanzar la petición)
  const { data: respuestaResponsables } = useFrappeGetCall(
    "prototipo.api.responsables.listar_responsables",
    undefined,
    editando ? undefined : null
  );
  const responsables = respuestaResponsables?.message ?? [];

  const esSubvencion = datos.tipo === "Subvención";
  const hayCambios =
    JSON.stringify(datos) !== JSON.stringify(valoresIniciales(proyecto, acuerdoMarco));

  const cambiar = (campo, valor) => setDatos((d) => ({ ...d, [campo]: valor }));

  // Al elegir tipo, la vía sigue la regla Subvención ⟺ vía Subvención
  const cambiarTipo = (tipo) =>
    setDatos((d) => ({
      ...d,
      tipo,
      via: tipo === "Subvención" ? "Subvención" : d.via === "Subvención" ? "" : d.via,
    }));

  const cerrar = () => {
    if (editando && hayCambios && !window.confirm("Hay cambios sin guardar. ¿Descartarlos?")) {
      return;
    }
    onCerrar();
  };

  const empezarEdicion = () => {
    setDatos(valoresIniciales(proyecto));
    setError(null);
    setEditando(true);
  };

  const cancelarEdicion = () => {
    // Si se abrió para editar, cancelar cierra la ficha en vez de pasar al detalle
    if (esNuevo || editarAlAbrir) return cerrar();
    setDatos(valoresIniciales(proyecto));
    setError(null);
    setEditando(false);
  };

  // Cerrar con Escape
  useEffect(() => {
    const alPulsar = (e) => e.key === "Escape" && cerrar();
    document.addEventListener("keydown", alPulsar);
    return () => document.removeEventListener("keydown", alPulsar);
  });

  const guardar = async (e) => {
    e.preventDefault();
    setError(null);

    const valores = {
      importe: datos.importe === "" ? 0 : Number(datos.importe),
      estado: datos.estado,
      descripcion: datos.descripcion || null,
      fecha_fin: datos.fecha_fin || null,
      responsable: datos.responsable || null,
    };
    // Cliente y vía de un contrato basado los fija el servidor (herencia del acuerdo)
    if (!esBasado) {
      valores.cliente = datos.cliente || null;
      valores.via = datos.via || null;
    }
    if (esSubvencion) {
      valores.lider_proyecto = datos.lider_proyecto || null;
      valores.miembros_consorcio = datos.miembros_consorcio || null;
    }

    try {
      if (esNuevo) {
        await createDoc("Proyecto", {
          ...valores,
          tipo: datos.tipo,
          ...(esNuevoBasado && { acuerdo_marco: acuerdoMarco.name }),
        });
      } else {
        await updateDoc("Proyecto", proyecto.name, valores);
      }
      onGuardado();
    } catch (err) {
      setError(mensajeDeError(err));
    }
  };

  // --- Cabecera ---
  let titulo = "Nuevo proyecto";
  if (esNuevoBasado) titulo = `Nuevo contrato basado de ${acuerdoMarco.name}`;
  else if (!esNuevo) titulo = proyecto.name;

  const subtitulo = esNuevo ? null : editando ? "Editando" : proyecto.tipo;
  const etiquetaCliente = esSubvencion ? "Donante" : "Cliente";
  const puedeGuardar = !guardando && datos.tipo && datos.via;

  // --- Cuerpo en modo detalle ---
  const vistaDetalle = !esNuevo && (
    <dl className="grid gap-5 overflow-y-auto p-6 sm:grid-cols-2">
      <Dato etiqueta="Tipo">{proyecto.tipo}</Dato>
      <Dato etiqueta={proyecto.tipo === "Subvención" ? "Donante" : "Cliente"}>
        {proyecto.cliente}
      </Dato>
      <Dato etiqueta="Vía">{proyecto.via}</Dato>
      <Dato etiqueta="Estado">{proyecto.estado}</Dato>
      <Dato etiqueta="Importe">{formatearImporte(proyecto.importe)}</Dato>
      <Dato etiqueta="Fecha de alta">{formatearFecha(proyecto.fecha_alta)}</Dato>
      <Dato etiqueta="Fecha de fin">{formatearFecha(proyecto.fecha_fin)}</Dato>
      <Dato etiqueta="Responsable">{proyecto.responsable_nombre || proyecto.responsable}</Dato>

      {proyecto.tipo === "Acuerdo marco" && (
        <>
          <Dato etiqueta="Importe consumido">{formatearImporte(proyecto.importe_consumido)}</Dato>
          <Dato etiqueta="Importe disponible">{formatearImporte(proyecto.importe_disponible)}</Dato>
        </>
      )}

      {proyecto.acuerdo_marco && (
        <Dato etiqueta="Acuerdo marco">
          <span className="font-mono font-semibold">{proyecto.acuerdo_marco}</span>
        </Dato>
      )}

      {proyecto.tipo === "Subvención" && (
        <>
          <TituloSeccion>Datos de la subvención</TituloSeccion>
          <Dato etiqueta="Líder del proyecto" ancho>
            {proyecto.lider_proyecto}
          </Dato>
          <Dato etiqueta="Miembros del consorcio" ancho>
            {proyecto.miembros_consorcio}
          </Dato>
        </>
      )}

      <TituloSeccion>Descripción</TituloSeccion>
      <Dato etiqueta="" ancho>
        {proyecto.descripcion}
      </Dato>
    </dl>
  );

  // --- Cuerpo en modo edición ---
  const vistaEdicion = (
    <div className="grid gap-5 overflow-y-auto p-6 sm:grid-cols-2">
      {/* Tipo: solo se elige al crear un proyecto suelto */}
      {esNuevo && !esBasado ? (
        <Selector
          etiqueta="Tipo"
          valor={datos.tipo}
          opciones={TIPOS_SUELTOS}
          onChange={cambiarTipo}
          vacio="Selecciona un tipo"
        />
      ) : (
        <CampoLectura etiqueta="Tipo" valor={datos.tipo} />
      )}

      {/* Cliente: heredado en los contratos basados */}
      {esBasado ? (
        <CampoLectura etiqueta="Cliente" valor={datos.cliente} />
      ) : (
        <BuscadorCliente
          valor={datos.cliente}
          onChange={(v) => cambiar("cliente", v)}
          clases={clases}
          etiqueta={etiquetaCliente}
          placeholder={`Selecciona un ${etiquetaCliente.toLowerCase()}`}
        />
      )}

      {/* Vía: heredada en contratos basados, fija en subvenciones */}
      {esBasado || esSubvencion ? (
        <CampoLectura etiqueta="Vía" valor={datos.via} />
      ) : (
        <Selector
          etiqueta="Vía"
          valor={datos.via}
          opciones={VIAS_NO_SUBVENCION}
          onChange={(v) => cambiar("via", v)}
          vacio="Selecciona una vía"
        />
      )}

      <Selector
        etiqueta="Estado"
        valor={datos.estado}
        opciones={ESTADOS}
        onChange={(v) => cambiar("estado", v)}
      />

      <CampoImporte
        etiqueta="Importe"
        valor={datos.importe}
        onChange={(v) => cambiar("importe", v)}
        clases={clases}
      />

      <CampoLectura
        etiqueta="Fecha de alta"
        valor={esNuevo ? "Se asignará al guardar" : formatearFecha(proyecto.fecha_alta)}
      />
      <label className="block">
        <span className={clases.etiqueta}>Fecha de fin</span>
        <input
          type="date"
          className={clases.campo}
          value={datos.fecha_fin}
          min={proyecto?.fecha_alta}
          onChange={(e) => cambiar("fecha_fin", e.target.value)}
        />
      </label>

      <SelectorResponsable
        valor={datos.responsable}
        opciones={responsables}
        nombreActual={proyecto?.responsable_nombre}
        onChange={(v) => cambiar("responsable", v)}
      />

      {esSubvencion && (
        <>
          <TituloSeccion>Datos de la subvención</TituloSeccion>
          <label className="block sm:col-span-2">
            <span className={clases.etiqueta}>Líder del proyecto</span>
            <input
              type="text"
              className={clases.campo}
              placeholder="Entidad que lidera la ejecución (p. ej., un ayuntamiento)"
              value={datos.lider_proyecto}
              onChange={(e) => cambiar("lider_proyecto", e.target.value)}
            />
          </label>
          <div className="sm:col-span-2">
            <AreaTexto
              etiqueta="Miembros del consorcio"
              valor={datos.miembros_consorcio}
              onChange={(v) => cambiar("miembros_consorcio", v)}
              clases={clases}
              filas={2}
              placeholder="Resto de entidades participantes (informativo)"
            />
          </div>
        </>
      )}

      <div className="sm:col-span-2">
        <AreaTexto
          etiqueta="Descripción"
          valor={datos.descripcion}
          onChange={(v) => cambiar("descripcion", v)}
          clases={clases}
        />
      </div>

      <p className="text-xs text-salvia-950/50 sm:col-span-2">
        {esNuevo && "El código se generará automáticamente al guardar. "}
        {esBasado && (
          <>
            Contrato basado del acuerdo marco{" "}
            <span className="font-mono font-semibold text-salvia-950">
              {acuerdoMarco?.name ?? proyecto?.acuerdo_marco}
            </span>
            : tipo, cliente y vía se heredan del acuerdo.{" "}
          </>
        )}
        {esNuevoBasado &&
          "Solo restan del saldo los contratos basados aceptados, en curso o cerrados."}
      </p>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-salvia-900/60 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && cerrar()}
    >
      <form
        onSubmit={guardar}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between bg-salvia-900 px-6 py-4">
          <div>
            <h2 className="font-mono text-lg font-bold text-salvia-200">{titulo}</h2>
            {subtitulo && <p className="text-xs text-white/60">{subtitulo}</p>}
          </div>
          <button
            type="button"
            onClick={cerrar}
            aria-label="Cerrar"
            className="grid h-8 w-8 place-items-center rounded-lg text-white/60 hover:bg-salvia hover:text-salvia-950"
          >
            ×
          </button>
        </div>

        <Pestanas activa={pestana} onCambiar={setPestana} propuestaDisponible={!esNuevo} />

        {/* Pestaña Datos: lo que ya había (detalle o edición del proyecto) */}
        {pestana === "datos" && (
          <>
            {esNuevoBasado && (
              <div className="flex items-center justify-between border-b border-salvia-900/10 bg-salvia/40 px-6 py-3 text-sm">
                <span className="text-salvia-950/70">Saldo disponible del acuerdo</span>
                <span className="font-semibold tabular-nums text-salvia-950">
                  {formatearImporte(acuerdoMarco.importe_disponible)}
                </span>
              </div>
            )}

            {editando ? vistaEdicion : vistaDetalle}

            {error && (
              <p className="mx-6 mb-2 whitespace-pre-line rounded-lg border-l-4 border-salvia-900 bg-salvia-100 px-3 py-2 text-sm text-salvia-950">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-3 border-t border-salvia-900/10 px-6 py-4">
              {editando ? (
                <>
                  <button
                    key="cancelar"
                    type="button"
                    onClick={cancelarEdicion}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-salvia-950/60 hover:bg-salvia-900/5 hover:text-salvia-950"
                  >
                    Cancelar
                  </button>
                  <button
                    key="guardar"
                    type="submit"
                    disabled={!puedeGuardar}
                    className="rounded-lg bg-salvia-900 px-5 py-2 text-sm font-semibold text-salvia-200 hover:bg-salvia hover:text-salvia-950 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {guardando ? "Guardando…" : "Guardar"}
                  </button>
                </>
              ) : (
                <button
                  key="editar"
                  type="button"
                  onClick={empezarEdicion}
                  className="rounded-lg bg-salvia-900 px-5 py-2 text-sm font-semibold text-salvia-200 hover:bg-salvia hover:text-salvia-950"
                >
                  Editar
                </button>
              )}
            </div>
          </>
        )}

        {/* Pestaña Propuesta: se mantiene montada (oculta) para no perder lo que se esté editando
            al cambiar de pestaña */}
        {!esNuevo && (
          <div className={pestana === "propuesta" ? "flex min-h-0 flex-col" : "hidden"}>
            <Propuesta proyecto={proyecto.name} />
          </div>
        )}
      </form>
    </div>
  );
}