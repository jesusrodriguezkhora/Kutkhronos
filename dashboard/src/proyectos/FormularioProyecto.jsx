import { useEffect, useState } from "react";
import { useFrappeCreateDoc, useFrappeUpdateDoc } from "frappe-react-sdk";
import { TIPOS, VIAS, ESTADOS } from "./opciones";
import { ESTILOS } from "../lib/estilos";
import { mensajeDeError } from "../lib/errores";
import BuscadorCliente from "../componentes/BuscadorCliente";
import CampoImporte from "../componentes/CampoImporte";

const clases = ESTILOS.claro;

function Selector({ etiqueta, valor, opciones, onChange, disabled, vacio }) {
  return (
    <label className="block">
      <span className={clases.etiqueta}>{etiqueta}</span>
      <select
        className={clases.campo}
        value={valor}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
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

export default function FormularioProyecto({ proyecto, onCerrar, onGuardado }) {
  const esNuevo = !proyecto;

  const [datos, setDatos] = useState({
    tipo: proyecto?.tipo ?? "",
    cliente: proyecto?.cliente ?? "",
    via: proyecto?.via ?? "",
    importe: proyecto?.importe ?? "",
    estado: proyecto?.estado ?? "Oportunidad",
  });
  const [error, setError] = useState(null);

  const { createDoc, loading: creando } = useFrappeCreateDoc();
  const { updateDoc, loading: actualizando } = useFrappeUpdateDoc();
  const guardando = creando || actualizando;

  const cambiar = (campo, valor) => setDatos((d) => ({ ...d, [campo]: valor }));

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
      cliente: datos.cliente || null,
      via: datos.via || null,
      importe: datos.importe === "" ? 0 : Number(datos.importe),
      estado: datos.estado,
    };

    try {
      if (esNuevo) {
        await createDoc("Proyecto", { ...valores, tipo: datos.tipo });
      } else {
        // El tipo no se envía al editar: es "Set Only Once" en el DocType
        await updateDoc("Proyecto", proyecto.name, valores);
      }
      onGuardado();
    } catch (err) {
      setError(mensajeDeError(err));
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}
    >
      <form
        onSubmit={guardar}
        className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between bg-black px-6 py-4">
          <h2 className="text-lg font-bold text-[#fadc6a]">
            {esNuevo ? "Nuevo proyecto" : `Editar ${proyecto.name}`}
          </h2>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="grid h-8 w-8 place-items-center rounded-lg text-white/60 hover:bg-[#fadc6a] hover:text-black"
          >
            ×
          </button>
        </div>

        <div className="grid gap-5 p-6 sm:grid-cols-2">
          <Selector
            etiqueta="Tipo"
            valor={datos.tipo}
            opciones={TIPOS}
            onChange={(v) => cambiar("tipo", v)}
            disabled={!esNuevo}
            vacio={esNuevo ? "Selecciona un tipo" : null}
          />
          <BuscadorCliente
            valor={datos.cliente}
            onChange={(v) => cambiar("cliente", v)}
            clases={clases}
            placeholder="Selecciona un cliente"
          />
          <Selector
            etiqueta="Vía"
            valor={datos.via}
            opciones={VIAS}
            onChange={(v) => cambiar("via", v)}
            vacio="—"
          />
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

          {esNuevo && (
            <p className="self-end text-xs text-black/50">
              El código se generará automáticamente al guardar.
            </p>
          )}
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
            disabled={guardando || !datos.tipo}
            className="rounded-lg bg-black px-5 py-2 text-sm font-semibold text-[#fadc6a] hover:bg-[#fadc6a] hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
          >
            {guardando ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}