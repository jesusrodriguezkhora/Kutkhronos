import { useEffect, useState } from "react";
import { useFrappeCreateDoc, useFrappeGetCall, useFrappeGetDocList, useFrappeUpdateDoc } from "frappe-react-sdk";
import { TIPOS_SUELTOS, ESTADOS, ESTADOS_CON_FEE, TIPOS_CON_FEE, ESTADOS_CON_GASTOS } from "./opciones";
import { UNIDADES, duracionDesdeFechas, finDesdeDuracion, textoDuracion } from "./duracion";
import { aniosDelProyecto, alinear, repartir, sumar } from "./importes";
import { ESTILOS } from "../lib/estilos";
import { mensajeDeError } from "../lib/errores";
import { formatearImporte, formatearFecha } from "../lib/formato";
import BuscadorCliente from "../componentes/BuscadorCliente";
import CampoImporte from "../componentes/CampoImporte";
import CampoFecha from "../componentes/CampoFecha";
import AreaTexto from "../componentes/AreaTexto";
import Propuesta from "./Propuesta";
import Gastos from "./Gastos";

const clases = ESTILOS.claro;

// Valores del formulario a partir de un proyecto existente o de un acuerdo marco (nuevo contrato basado)
function valoresIniciales(proyecto, acuerdoMarco) {
  const esNuevoBasado = !proyecto && !!acuerdoMarco;
  return {
    tipo: proyecto?.tipo ?? (esNuevoBasado ? "Contrato basado" : ""),
    cliente: proyecto?.cliente ?? acuerdoMarco?.cliente ?? "",
    importe: proyecto?.importe ?? "",
    importes_anuales: (proyecto?.importes_anuales ?? []).map((f) => ({ anio: f.anio, importe: f.importe })),
    estado: proyecto?.estado ?? "Oportunidad",
    descripcion: proyecto?.descripcion ?? "",
    fecha_inicio: proyecto?.fecha_inicio ?? "",
    fecha_fin: proyecto?.fecha_fin ?? "",
    duracion: proyecto?.duracion ?? "",
    unidad_duracion: proyecto?.unidad_duracion || "Meses",
    responsable: proyecto?.responsable ?? "",
    facturacion: proyecto?.facturacion ?? "",
    canarias: !!proyecto?.canarias,
    motivo_rechazo: proyecto?.motivo_rechazo ?? "",
    subtipo: proyecto?.subtipo ?? "",
    lider_proyecto: proyecto?.lider_proyecto ?? "",
    miembros_consorcio: proyecto?.miembros_consorcio ?? "",
  };
}

// Pestañas bajo la cabecera. La propuesta solo existe para proyectos ya guardados; los gastos, solo
// para proyectos aceptados (si no, la pestaña no se muestra).
const PESTANAS = [
  { clave: "datos", etiqueta: "Datos" },
  { clave: "propuesta", etiqueta: "Fee Estimate" },
  { clave: "gastos", etiqueta: "Gastos" },
];

// Clases completas (Tailwind solo genera las que aparecen escritas tal cual en el código)
const COLUMNAS = { 2: "grid-cols-2", 3: "grid-cols-3" };

function Pestanas({ activa, onCambiar, propuestaDisponible, gastosDisponibles }) {
  const visibles = PESTANAS.filter((p) => p.clave !== "gastos" || gastosDisponibles);
  return (
    <div role="tablist" className={`grid ${COLUMNAS[visibles.length]} border-b border-salvia-900/10`}>
      {visibles.map(({ clave, etiqueta }) => {
        const deshabilitada = clave === "propuesta" && !propuestaDisponible;
        const activo = activa === clave;
        return (
          <button
            key={clave}
            type="button"
            role="tab"
            aria-selected={activo}
            disabled={deshabilitada}
            title={deshabilitada ? "Guarda el proyecto para preparar su fee" : undefined}
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

  // La pestaña Gastos solo existe en proyectos guardados que han salido de oportunidad
  const gastosDisponibles = !esNuevo && ESTADOS_CON_GASTOS.includes(proyecto.estado);

  const [editando, setEditando] = useState(esNuevo || editarAlAbrir);
  const [datos, setDatos] = useState(() => valoresIniciales(proyecto, acuerdoMarco));
  const [error, setError] = useState(null);
  const [pestana, setPestana] = useState("datos");
  const [propuestaConCambios, setPropuestaConCambios] = useState(false);

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

  // Subtipos de subvención (los mantiene un administrador desde el Desk). Solo se piden al editar una subvención.
  const { data: subtipos } = useFrappeGetDocList(
    "Subtipo Subvencion",
    { fields: ["name"], orderBy: { field: "name", order: "asc" }, limit: 100 },
    editando && esSubvencion ? undefined : null
  );

  // El motivo de rechazo solo existe en Rechazado. Es obligatorio al pasar a Rechazado (o si ya tenía
  // uno); los que ya estaban rechazados sin motivo se pueden seguir editando (mismo criterio que el servidor).
  const esRechazado = datos.estado === "Rechazado";
  const motivoObligatorio =
    esRechazado && (esNuevo || proyecto.estado !== "Rechazado" || !!proyecto.motivo_rechazo);
  const faltaMotivo = motivoObligatorio && !datos.motivo_rechazo.trim();

  // Un proyecto nuevo que necesita fee no puede nacer aceptado (su fee aún no existe)
  const exigeFee = TIPOS_CON_FEE.includes(datos.tipo);
  const estadosPosibles = esNuevo && exigeFee ? ESTADOS.filter((e) => !ESTADOS_CON_FEE.includes(e)) : ESTADOS;

  const hayCambios =
    JSON.stringify(datos) !== JSON.stringify(valoresIniciales(proyecto, acuerdoMarco));

  const cambiar = (campo, valor) => setDatos((d) => ({ ...d, [campo]: valor }));

  // Fecha de fin y duración: al cambiar una, se recalcula la otra (el servidor lo repite al guardar).
  const cambiarFin = (fin) =>
    setDatos((d) => ({ ...d, fecha_fin: fin, duracion: duracionDesdeFechas(d.fecha_inicio, fin, d.unidad_duracion) }));

  const cambiarDuracion = (duracion) =>
    setDatos((d) => ({
      ...d,
      duracion,
      fecha_fin: finDesdeDuracion(d.fecha_inicio, duracion, d.unidad_duracion) || d.fecha_fin,
    }));

  // Misma fecha de fin, expresada en la otra unidad (sin fin, el número se reinterpreta y mueve el fin)
  const cambiarUnidad = (unidad) =>
    setDatos((d) =>
      d.fecha_inicio && d.fecha_fin
        ? { ...d, unidad_duracion: unidad, duracion: duracionDesdeFechas(d.fecha_inicio, d.fecha_fin, unidad) }
        : { ...d, unidad_duracion: unidad, fecha_fin: finDesdeDuracion(d.fecha_inicio, d.duracion, unidad) || d.fecha_fin }
    );

  // Al cambiar el inicio: con fecha de fin, se recalcula la duración; sin ella, el fin a partir de la duración
  const cambiarInicio = (inicio) =>
    setDatos((d) =>
      d.fecha_fin
        ? { ...d, fecha_inicio: inicio, duracion: duracionDesdeFechas(inicio, d.fecha_fin, d.unidad_duracion) }
        : { ...d, fecha_inicio: inicio, fecha_fin: finDesdeDuracion(inicio, d.duracion, d.unidad_duracion) }
    );
  // Importe por año: una fila por año natural. Sin filas guardadas (o sin tocar), el reparto por
  // defecto sigue al importe; con filas, se conservan y solo se avisa si no cuadran.
  const anios = aniosDelProyecto(datos.fecha_inicio, datos.fecha_fin);
  const filasAnuales = datos.importes_anuales.length
    ? alinear(datos.importes_anuales, anios)
    : repartir(datos.importe, anios);
  const sumaAnual = sumar(filasAnuales);
  const anualNoCuadra = anios.length > 0 && Math.abs(sumaAnual - (Number(datos.importe) || 0)) > 0.005;

  const cambiarAnual = (anio, valor) =>
    cambiar("importes_anuales", filasAnuales.map((f) => (f.anio === anio ? { ...f, importe: valor } : f)));
  const repartirAnual = () => cambiar("importes_anuales", repartir(datos.importe, anios));

  // Un proyecto nuevo que pasa a necesitar fee vuelve a oportunidad si estaba aceptado
  const cambiarTipo = (tipo) =>
    setDatos((d) => ({
      ...d,
      tipo,
      estado:
        esNuevo && TIPOS_CON_FEE.includes(tipo) && ESTADOS_CON_FEE.includes(d.estado) ? "Oportunidad" : d.estado,
    }));

    const cerrar = () => {
    const datosSinGuardar = editando && hayCambios;
    if ((datosSinGuardar || propuestaConCambios) && !window.confirm("Hay cambios sin guardar. ¿Descartarlos?")) {
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
      fecha_inicio: datos.fecha_inicio || null,
      fecha_fin: datos.fecha_fin || null,
      duracion: datos.duracion === "" || datos.duracion == null ? null : Number(datos.duracion),
      unidad_duracion: datos.unidad_duracion,
      importes_anuales: filasAnuales.map((f) => ({ anio: f.anio, importe: Number(f.importe) || 0 })),
      responsable: datos.responsable || null,
      facturacion: datos.facturacion.trim() || null,
      canarias: datos.canarias ? 1 : 0,
      motivo_rechazo: esRechazado ? datos.motivo_rechazo.trim() || null : null,
    };
    // El cliente de un contrato basado lo fija el servidor (herencia del acuerdo)
    if (!esBasado) {
      valores.cliente = datos.cliente || null;
    }
    if (esSubvencion) {
      valores.subtipo = datos.subtipo || null;
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
  const puedeGuardar = !guardando && datos.tipo && !faltaMotivo && !anualNoCuadra;

  // --- Cuerpo en modo detalle ---
  const vistaDetalle = !esNuevo && (
    <dl className="grid gap-5 overflow-y-auto p-6 sm:grid-cols-2">
      <Dato etiqueta="Tipo">{proyecto.tipo}</Dato>
      <Dato etiqueta={proyecto.tipo === "Subvención" ? "Donante" : "Cliente"}>
        {proyecto.cliente}
      </Dato>
      <Dato etiqueta="Estado">{proyecto.estado}</Dato>
      <Dato etiqueta="Importe">{formatearImporte(proyecto.importe)}</Dato>
      <Dato etiqueta="Fecha de alta">{formatearFecha(proyecto.fecha_alta)}</Dato>
      <Dato etiqueta="Fecha de inicio">{formatearFecha(proyecto.fecha_inicio)}</Dato>
      <Dato etiqueta="Fecha de fin">{formatearFecha(proyecto.fecha_fin)}</Dato>
      <Dato etiqueta="Duración">{textoDuracion(proyecto.duracion, proyecto.unidad_duracion)}</Dato>
      <Dato etiqueta="Responsable">{proyecto.responsable_nombre || proyecto.responsable}</Dato>
      <Dato etiqueta="Facturación">{proyecto.facturacion}</Dato>
      <Dato etiqueta="Canarias">{proyecto.canarias ? "Sí (factura sin IVA)" : "No"}</Dato>

      {proyecto.importes_anuales?.length > 0 && (
        <Dato etiqueta="Importe por año" ancho>
          {proyecto.importes_anuales
            .map((f, i) => `Año ${i + 1} (${f.anio}): ${formatearImporte(f.importe)}`)
            .join("\n")}
        </Dato>
      )}

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
          <Dato etiqueta="Subtipo">{proyecto.subtipo}</Dato>
          <Dato etiqueta="Líder del proyecto" ancho>
            {proyecto.lider_proyecto}
          </Dato>
          <Dato etiqueta="Miembros del consorcio" ancho>
            {proyecto.miembros_consorcio}
          </Dato>
        </>
      )}

      {proyecto.estado === "Rechazado" && (
        <>
          <TituloSeccion>Motivo de rechazo</TituloSeccion>
          <Dato etiqueta="" ancho>
            {proyecto.motivo_rechazo}
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

      <Selector
        etiqueta="Estado"
        valor={datos.estado}
        opciones={estadosPosibles}
        onChange={(v) => cambiar("estado", v)}
      />

      {esRechazado && (
        <div className="sm:col-span-2">
          <AreaTexto
            etiqueta={motivoObligatorio ? "Motivo de rechazo *" : "Motivo de rechazo"}
            valor={datos.motivo_rechazo}
            onChange={(v) => cambiar("motivo_rechazo", v)}
            clases={clases}
            filas={3}
            placeholder="Por qué se ha rechazado el proyecto"
          />
          {faltaMotivo && (
            <p className="mt-1 text-xs text-red-700">Indica el motivo de rechazo para poder guardar.</p>
          )}
        </div>
      )}

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
        <span className={clases.etiqueta}>Fecha de inicio</span>
        <CampoFecha
          etiqueta="Fecha de inicio"
          className={clases.campo}
          valor={datos.fecha_inicio}
          max={datos.fecha_fin || undefined}
          onChange={cambiarInicio}
        />
      </label>

      <div className="space-y-3 rounded-lg border border-salvia-900/10 p-4 sm:col-span-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className={clases.etiqueta}>Duración</span>
          <span className="text-xs text-salvia-950/50">Cambia la fecha de fin o la duración: la otra se calcula sola.</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className={clases.etiqueta}>Fecha de fin</span>
            <CampoFecha
              etiqueta="Fecha de fin"
              className={clases.campo}
              valor={datos.fecha_fin}
              min={datos.fecha_inicio || undefined}
              onChange={cambiarFin}
            />
          </label>

          <label className="block">
            <span className={clases.etiqueta}>Número</span>
            <input
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              className={clases.campo}
              value={datos.duracion}
              onChange={(e) => cambiarDuracion(e.target.value)}
            />
          </label>

          <label className="block">
            <span className={clases.etiqueta}>Unidad</span>
            <select
              className={clases.campo}
              value={datos.unidad_duracion}
              onChange={(e) => cambiarUnidad(e.target.value)}
            >
              {UNIDADES.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </label>
        </div>

        {!datos.fecha_inicio && Number(datos.duracion) > 0 && (
          <p className="text-xs text-salvia-950/60">Indica la fecha de inicio para calcular la fecha de fin.</p>
        )}
      </div>

      {anios.length > 0 && (
        <div className="space-y-3 rounded-lg border border-salvia-900/10 p-4 sm:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className={clases.etiqueta}>Importe por año</span>
            <span className={`text-xs tabular-nums ${anualNoCuadra ? "text-red-700" : "text-salvia-950/50"}`}>
              Suma {formatearImporte(sumaAnual)} de {formatearImporte(Number(datos.importe) || 0)}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {filasAnuales.map((f, i) => (
              <div key={f.anio}>
                <div className="mb-1 text-sm font-medium text-salvia-950">
                  Año {i + 1} <span className="text-xs font-normal text-salvia-950/50">· {f.anio}</span>
                </div>
                <CampoImporte etiqueta="" valor={f.importe} onChange={(v) => cambiarAnual(f.anio, v)} clases={clases} />
              </div>
            ))}
          </div>

          {anualNoCuadra && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
              <span>La suma por año no coincide con el importe total. Ajusta los años o repártelo de nuevo.</span>
              <button
                type="button"
                onClick={repartirAnual}
                className="rounded-md bg-white px-3 py-1 font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-100"
              >
                Repartir a partes iguales
              </button>
            </div>
          )}
        </div>
      )}

      <SelectorResponsable
        valor={datos.responsable}
        opciones={responsables}
        nombreActual={proyecto?.responsable_nombre}
        onChange={(v) => cambiar("responsable", v)}
      />

      <label className="block">
        <span className={clases.etiqueta}>Facturación</span>
        <input
          type="text"
          className={clases.campo}
          maxLength={140}
          placeholder="Cada cuánto se factura (p. ej., mensual)"
          value={datos.facturacion}
          onChange={(e) => cambiar("facturacion", e.target.value)}
        />
      </label>

      <label className="flex items-center gap-2 self-end pb-2 text-sm text-salvia-950">
        <input
          type="checkbox"
          className="h-4 w-4 accent-salvia-900"
          checked={datos.canarias}
          onChange={(e) => cambiar("canarias", e.target.checked)}
        />
        Canarias
        <span className="text-salvia-950/50">(factura sin IVA)</span>
      </label>

      {esSubvencion && (
        <>
          <TituloSeccion>Datos de la subvención</TituloSeccion>
          <Selector
            etiqueta="Subtipo"
            valor={datos.subtipo}
            opciones={(subtipos ?? []).map((s) => s.name)}
            onChange={(v) => cambiar("subtipo", v)}
            vacio="Sin subtipo"
          />
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
        {exigeFee &&
          (esNuevo
            ? "Para pasarlo a aceptado, guárdalo primero y prepara su fee estimate. "
            : "Para pasar a aceptado hace falta un fee estimate guardado con honorarios. ")}
        {esBasado && (
          <>
            Contrato basado del acuerdo marco{" "}
            <span className="font-mono font-semibold text-salvia-950">
              {acuerdoMarco?.name ?? proyecto?.acuerdo_marco}
            </span>
            : tipo y cliente se heredan del acuerdo.{" "}
          </>
        )}
        {esNuevoBasado &&
          "Solo restan del saldo los contratos basados aceptados."}
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

        <Pestanas activa={pestana} onCambiar={setPestana} propuestaDisponible={!esNuevo} gastosDisponibles={gastosDisponibles} />

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
          <div className={pestana === "propuesta" ? "flex min-h-0 flex-1 flex-col" : "hidden"}>
            <Propuesta proyecto={proyecto.name} onCambiosPendientes={setPropuestaConCambios} />
          </div>
        )}
        
        {/* Pestaña Gastos: solo lectura; se pide de nuevo cada vez que se abre */}
        {pestana === "gastos" && gastosDisponibles && (
          <div className="flex min-h-0 flex-1 flex-col">
            <Gastos proyecto={proyecto.name} />
          </div>
        )}
      </form>
    </div>
  );
}