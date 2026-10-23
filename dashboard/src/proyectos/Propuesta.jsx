import { useEffect, useState } from "react";
import { useFrappeGetCall, useFrappePostCall } from "frappe-react-sdk";
import { ESTILOS } from "../lib/estilos";
import { mensajeDeError } from "../lib/errores";
import { formatearCosteHora, formatearFecha, formatearImporte } from "../lib/formato";
import CampoImporte from "../componentes/CampoImporte";

const clases = ESTILOS.claro;

// Costes directos que se introducen en euros (no por horas)
const DIRECTOS = [
  { campo: "viajes", etiqueta: "Viajes" },
  { campo: "otros_costes_directos", etiqueta: "Otros costes directos" },
  { campo: "subcontratacion", etiqueta: "Subcontratación" },
];

const miles = new Intl.NumberFormat("es-ES", { useGrouping: "always" });
const porcentaje = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 });
const numero = (valor) => Number(valor) || 0;

// Valores editables (como texto, para los inputs) a partir de la propuesta guardada o vacíos
function valoresIniciales(posiciones, propuesta) {
  const horas = Object.fromEntries(posiciones.map((p) => [p, ""]));
  for (const l of propuesta?.lineas ?? []) {
    if (l.categoria in horas) horas[l.categoria] = l.horas ? String(l.horas) : "";
  }
  const importe = (campo) => (propuesta?.[campo] ? String(Math.round(propuesta[campo])) : "");
  return {
    honorarios: importe("honorarios"),
    ...Object.fromEntries(DIRECTOS.map(({ campo }) => [campo, importe(campo)])),
    horas,
  };
}

// Mismo cálculo que el controlador de Propuesta (propuesta.py), para verlo en vivo al editar
function calcular(valores, posiciones, costeHora, porcentajeIndirectos) {
  const lineas = posiciones.map((categoria) => {
    const horas = numero(valores.horas[categoria]);
    const coste_hora = numero(costeHora[categoria]);
    return { categoria, horas, coste_hora, coste: horas * coste_hora, sinCoste: horas > 0 && !coste_hora };
  });

  const honorarios = numero(valores.honorarios);
  const personal = lineas.reduce((total, l) => total + l.coste, 0);
  const directos = numero(valores.viajes) + numero(valores.otros_costes_directos);
  const subcontratacion = numero(valores.subcontratacion);
  const indirectos = (honorarios * porcentajeIndirectos) / 100;
  const margenBruto = honorarios - personal - directos - subcontratacion;
  const margenNeto = margenBruto - indirectos;
  const pct = (valor) => (honorarios ? (valor / honorarios) * 100 : 0);

  return {
    lineas,
    honorarios,
    indirectos,
    costeTotal: personal + directos + subcontratacion + indirectos,
    margenBruto,
    margenBrutoPct: pct(margenBruto),
    margenNeto,
    margenNetoPct: pct(margenNeto),
  };
}

// "2026-10-19 12:18:33.123" -> "Última edición el 19/10/2026 a las 12:18 por Ana García"
function textoUltimaEdicion(propuesta) {
  if (!propuesta) return "Este proyecto todavía no tiene fee estimate guardado.";
  const [fecha, hora] = propuesta.modificado.split(" ");
  return `Última edición el ${formatearFecha(fecha)} a las ${hora.slice(0, 5)} por ${propuesta.modificado_por}.`;
}

// Número entero en una celda de la tabla (horas o euros)
function Entrada({ valor, onChange, etiqueta, sufijo }) {
  return (
    <div className="relative">
      <input
        type="text"
        inputMode="numeric"
        aria-label={etiqueta}
        className={`${clases.campo} py-1.5 text-right tabular-nums ${sufijo ? "pr-7" : ""}`}
        value={valor === "" ? "" : miles.format(Number(valor))}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
      />
      {sufijo && (
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-salvia-950/40">
          {sufijo}
        </span>
      )}
    </div>
  );
}

function Fila({ categoria, detalle, horas, coste, avisar }) {
  return (
    <tr>
      <td className="py-2 pr-3">
        <div className="font-medium text-salvia-950">{categoria}</div>
        {detalle && (
          <div className={`text-xs ${avisar ? "text-red-600" : "text-salvia-950/50"}`}>{detalle}</div>
        )}
      </td>
      <td className="py-2 pr-3">{horas ?? <span className="block text-right text-salvia-950/30">—</span>}</td>
      <td className="py-2 text-right tabular-nums">{coste}</td>
    </tr>
  );
}

function Margen({ titulo, importe, pct, objetivo, hayHonorarios }) {
  const cumple = pct >= objetivo;
  const estilo = !hayHonorarios
    ? "border-salvia-900/10 bg-salvia-900/[0.03]"
    : cumple
      ? "border-salvia-300 bg-salvia-100"
      : "border-red-200 bg-red-50";
  const colorTexto = !hayHonorarios ? "text-salvia-950/50" : cumple ? "text-salvia-800" : "text-red-700";

  return (
    <div className={`rounded-xl border px-4 py-3 ${estilo}`}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-salvia-950/60">{titulo}</span>
        <span className="text-lg font-semibold tabular-nums text-salvia-950">
          {formatearImporte(importe)}
          <span className="ml-1 text-sm font-normal text-salvia-950/60">/ {porcentaje.format(pct)} %</span>
        </span>
      </div>
      <p className={`mt-1 text-xs ${colorTexto}`}>
        {!hayHonorarios
          ? `Objetivo: ${objetivo} %`
          : cumple
            ? `✓ Por encima del objetivo (${objetivo} %)`
            : `✗ Por debajo del objetivo (${objetivo} %)`}
      </p>
    </div>
  );
}

// Pestaña Propuesta de la ficha del proyecto (fee estimate).
// Los cálculos de aquí son solo para verlos en vivo: al guardar, los rehace el servidor.
export default function Propuesta({ proyecto, onCambiosPendientes }) {
  const { data, error: errorCarga, isLoading, mutate } = useFrappeGetCall(
    "prototipo.api.propuestas.obtener_propuesta",
    { proyecto }
  );
  const { call, loading: guardando } = useFrappePostCall("prototipo.api.propuestas.guardar_propuesta");

  const info = data?.message;
  const [valores, setValores] = useState(null);
  const [error, setError] = useState(null);

  // Rellenar el formulario cuando llega la propuesta
  useEffect(() => {
    if (info && valores === null) setValores(valoresIniciales(info.posiciones, info.propuesta));
  }, [info, valores]);

  const hayCambios =
    !!info &&
    !!valores &&
    JSON.stringify(valores) !== JSON.stringify(valoresIniciales(info.posiciones, info.propuesta));

  // Avisar a la ficha para que pregunte antes de cerrar con cambios sin guardar
  useEffect(() => {
    onCambiosPendientes?.(hayCambios);
  }, [hayCambios, onCambiosPendientes]);

  if (isLoading || (info && !valores)) {
    return <p className="p-6 text-sm text-salvia-950/50">Cargando fee estimate…</p>;
  }
  if (errorCarga || !info) {
    return <p className="p-6 text-sm text-red-600">{mensajeDeError(errorCarga)}</p>;
  }

  const { posiciones, propuesta } = info;

  // Sin cambios se ven los costes/hora congelados de la propuesta guardada; al editar, los de hoy
  // (que son los que usará el servidor al guardar)
  const costeHora =
    propuesta && !hayCambios
      ? Object.fromEntries(propuesta.lineas.map((l) => [l.categoria, l.coste_hora]))
      : info.coste_hora_actual;
  const r = calcular(valores, posiciones, costeHora, info.porcentaje_indirectos);
  const faltanCostes = r.lineas.some((l) => l.sinCoste);

  const cambiar = (campo, valor) => setValores((v) => ({ ...v, [campo]: valor }));
  const cambiarHoras = (categoria, valor) =>
    setValores((v) => ({ ...v, horas: { ...v.horas, [categoria]: valor } }));

  const descartar = () => {
    setValores(valoresIniciales(posiciones, propuesta));
    setError(null);
  };

  const guardar = async () => {
    setError(null);
    try {
      const respuesta = await call({
        proyecto,
        datos: {
          honorarios: numero(valores.honorarios),
          ...Object.fromEntries(DIRECTOS.map(({ campo }) => [campo, numero(valores[campo])])),
          horas: Object.fromEntries(posiciones.map((p) => [p, numero(valores.horas[p])])),
        },
      });
      await mutate(respuesta, { revalidate: false });
      setValores(valoresIniciales(respuesta.message.posiciones, respuesta.message.propuesta));
    } catch (err) {
      setError(mensajeDeError(err));
    }
  };

  const th = "pb-2 text-xs font-semibold uppercase tracking-wider text-salvia-950/60";

  return (
    <>
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6">
        <CampoImporte
          etiqueta="Honorarios"
          valor={valores.honorarios}
          onChange={(v) => cambiar("honorarios", v)}
          clases={clases}
        />

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-salvia-900/10 text-left">
              <th className={th}>Categoría</th>
              <th className={`${th} w-28 pr-3 text-right`}>Horas</th>
              <th className={`${th} w-36 text-right`}>Coste</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-salvia-900/5">
            {r.lineas.map((l) => (
              <Fila
                key={l.categoria}
                categoria={l.categoria}
                avisar={l.sinCoste}
                horas={
                  <Entrada
                    etiqueta={`Horas de ${l.categoria}`}
                    valor={valores.horas[l.categoria]}
                    onChange={(v) => cambiarHoras(l.categoria, v)}
                  />
                }
                coste={l.sinCoste ? "—" : formatearImporte(l.coste)}
              />
            ))}

            {DIRECTOS.map(({ campo, etiqueta }) => (
              <Fila
                key={campo}
                categoria={etiqueta}
                coste={<Entrada etiqueta={etiqueta} valor={valores[campo]} onChange={(v) => cambiar(campo, v)} sufijo="€" />}
              />
            ))}

            <Fila
              categoria="Gastos indirectos"
              detalle={`${info.porcentaje_indirectos} % de los honorarios`}
              coste={formatearImporte(r.indirectos)}
            />
          </tbody>

          <tfoot>
            <tr className="border-t-2 border-salvia-900/15">
              <td className="pt-3 font-bold text-salvia-950">Coste total</td>
              <td />
              <td className="pt-3 text-right font-bold tabular-nums text-salvia-950">
                {formatearImporte(r.costeTotal)}
              </td>
            </tr>
          </tfoot>
        </table>

        <div className="grid gap-3 sm:grid-cols-2">
          <Margen
            titulo="Margen bruto"
            importe={r.margenBruto}
            pct={r.margenBrutoPct}
            objetivo={info.margen_bruto_objetivo}
            hayHonorarios={r.honorarios > 0}
          />
          <Margen
            titulo="Margen neto"
            importe={r.margenNeto}
            pct={r.margenNetoPct}
            objetivo={info.margen_neto_objetivo}
            hayHonorarios={r.honorarios > 0}
          />
        </div>

        {error && (
          <p className="whitespace-pre-line rounded-lg border-l-4 border-salvia-900 bg-salvia-100 px-3 py-2 text-sm text-salvia-950">
            {error}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-salvia-900/10 px-6 py-4">
        <p className="text-xs text-salvia-950/50">{textoUltimaEdicion(propuesta)}</p>
        <div className="flex shrink-0 gap-3">
          {hayCambios && (
            <button
              type="button"
              onClick={descartar}
              className="rounded-lg px-4 py-2 text-sm font-medium text-salvia-950/60 hover:bg-salvia-900/5 hover:text-salvia-950"
            >
              Descartar
            </button>
          )}
          {/* type="button": toda la ficha es un <form> que guarda los datos del proyecto */}
          <button
            type="button"
            onClick={guardar}
            disabled={!hayCambios || guardando || faltanCostes}
            title={faltanCostes ? "Hay horas en posiciones sin coste/hora" : undefined}
            className="rounded-lg bg-salvia-900 px-5 py-2 text-sm font-semibold text-salvia-200 hover:bg-salvia hover:text-salvia-950 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {guardando ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </>
  );
}