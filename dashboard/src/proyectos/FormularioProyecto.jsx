import { useEffect, useState } from "react";
import { useFrappeCreateDoc, useFrappeUpdateDoc } from "frappe-react-sdk";
import { TIPOS_SUELTOS, VIAS_NO_SUBVENCION, ESTADOS } from "./opciones";
import { ESTILOS } from "../lib/estilos";
import { mensajeDeError } from "../lib/errores";
import { formatearImporte, formatearFecha } from "../lib/formato";
import BuscadorCliente from "../componentes/BuscadorCliente";
import CampoImporte from "../componentes/CampoImporte";
import AreaTexto from "../componentes/AreaTexto";

const clases = ESTILOS.claro;

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

// Valor que el usuario no puede modificar (lo fija el servidor o no cambia tras crear)
function CampoLectura({ etiqueta, valor }) {
  return (
    <div>
      <span className={clases.etiqueta}>{etiqueta}</span>
      <div className="w-full cursor-not-allowed rounded-lg border border-black/10 bg-black/5 px-3 py-2 text-sm text-black/60">
        {valor || "—"}
      </div>
    </div>
  );
}

// Tres modos según las props:
//   - nuevo proyecto:        sin proyecto ni acuerdoMarco
//   - editar:                con proyecto
//   - nuevo contrato basado: con acuerdoMarco (el acuerdo completo)
export default function FormularioProyecto({ proyecto, acuerdoMarco, onCerrar, onGuardado }) {
  const esNuevo = !proyecto;
  const esNuevoBasado = esNuevo && !!acuerdoMarco;
  const esBasado = esNuevoBasado || !!proyecto?.acuerdo_marco;
  const codigoAcuerdo = acuerdoMarco?.name ?? proyecto?.acuerdo_marco;

  const [datos, setDatos] = useState({
    tipo: proyecto?.tipo ?? (esNuevoBasado ? "Contrato basado" : ""),
    cliente: proyecto?.cliente ?? acuerdoMarco?.cliente ?? "",
    via: proyecto?.via ?? acuerdoMarco?.via ?? "",
    importe: proyecto?.importe ?? "",
    estado: proyecto?.estado ?? "Oportunidad",
    observaciones: proyecto?.observaciones ?? "",
    lider_proyecto: proyecto?.lider_proyecto ?? "",
    miembros_consorcio: proyecto?.miembros_consorcio ?? "",
  });
  const [error, setError] = useState(null);

  const { createDoc, loading: creando } = useFrappeCreateDoc();
  const { updateDoc, loading: actualizando } = useFrappeUpdateDoc();
  const guardando = creando || actualizando;

  const esSubvencion = datos.tipo === "Subvención";

  const cambiar = (campo, valor) => setDatos((d) => ({ ...d, [campo]: valor }));

  // Al elegir tipo, la vía sigue la regla Subvención ⟺ vía Subvención
  const cambiarTipo = (tipo) =>
    setDatos((d) => ({
      ...d,
      tipo,
      via: tipo === "Subvención" ? "Subvención" : d.via === "Subvención" ? "" : d.via,
    }));

  // Cerrar con Escape
  useEffect(() => {
    const alPulsar = (e) => e.key === "Escape" && onCerrar();
    document.addEventListener("keydown", alPulsar);
    return () => document.removeEventListener("keydown", alPulsar);
  }, [onCerrar]);

  const guardar = async (e) => {
    e.preventDefault();
    setError(null);

    const valores = {
      importe: datos.importe === "" ? 0 : Number(datos.importe),
      estado: datos.estado,
      observaciones: datos.observaciones || null,
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

  let titulo = "Nuevo proyecto";
  if (esNuevoBasado) titulo = `Nuevo contrato basado de ${acuerdoMarco.name}`;
  else if (!esNuevo) titulo = `Editar ${proyecto.name}`;

  const etiquetaCliente = esSubvencion ? "Donante" : "Cliente";
  const puedeGuardar = !guardando && datos.tipo && datos.via;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}
    >
      <form
        onSubmit={guardar}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between bg-black px-6 py-4">
          <h2 className="text-lg font-bold text-[#fadc6a]">{titulo}</h2>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="grid h-8 w-8 place-items-center rounded-lg text-white/60 hover:bg-[#fadc6a] hover:text-black"
          >
            ×
          </button>
        </div>

        {esNuevoBasado && (
          <div className="flex items-center justify-between border-b border-black/10 bg-[#fadc6a]/30 px-6 py-3 text-sm">
            <span className="text-black/70">Saldo disponible del acuerdo</span>
            <span className="font-semibold tabular-nums text-black">
              {formatearImporte(acuerdoMarco.importe_disponible)}
            </span>
          </div>
        )}

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

          {esSubvencion && (
            <>
              <h3 className="border-t border-black/10 pt-4 text-sm font-bold sm:col-span-2">
                Datos de la subvención
              </h3>
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
              etiqueta="Observaciones"
              valor={datos.observaciones}
              onChange={(v) => cambiar("observaciones", v)}
              clases={clases}
            />
          </div>

          <p className="text-xs text-black/50 sm:col-span-2">
            {esNuevo && "El código se generará automáticamente al guardar. "}
            {esBasado && (
              <>
                Contrato basado del acuerdo marco{" "}
                <span className="font-mono font-semibold text-black">{codigoAcuerdo}</span>: tipo,
                cliente y vía se heredan del acuerdo.{" "}
              </>
            )}
            {esNuevoBasado &&
              "Solo restan del saldo los contratos basados aceptados, en curso o cerrados."}
          </p>
        </div>

        {error && (
          <p className="mx-6 mb-2 whitespace-pre-line rounded-lg border-l-4 border-black bg-[#fadc6a]/40 px-3 py-2 text-sm text-black">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3 border-t border-black/10 px-6 py-4">
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-lg px-4 py-2 text-sm font-medium text-black/60 hover:bg-black/5 hover:text-black"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!puedeGuardar}
            className="rounded-lg bg-black px-5 py-2 text-sm font-semibold text-[#fadc6a] hover:bg-[#fadc6a] hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
          >
            {guardando ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}