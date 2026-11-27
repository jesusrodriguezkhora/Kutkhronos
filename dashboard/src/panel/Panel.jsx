import { useState } from "react";
import { useFrappeGetCall, useFrappePostCall } from "frappe-react-sdk";
import CampoImporte from "../componentes/CampoImporte";
import { mensajeDeError } from "../lib/errores";
import { ESTILOS } from "../lib/estilos";
import { formatearImporte, formatearPorcentaje } from "../lib/formato";
import { BarrasHorizontales, Indicador, Medidor, Tarjeta } from "./graficos";

const MAX_CLIENTES = 10;

const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

// Qué cuenta cada columna del pipeline (para el subtítulo y la tabla)
const DESCRIPCION_ESTADO = {
  Aceptado: "Aceptados y cerrados",
  Propuesta: "Presentadas, pendientes de decisión",
  Oportunidad: "Identificadas, sin presentar",
  Rechazado: "Oportunidades o propuestas que no siguen adelante",
};

// Columnas de la vista en tabla de un reparto con % sobre el total
function columnasReparto(etiqueta, total) {
  return [
    { clave: "clave", etiqueta },
    { clave: "num", etiqueta: "Proyectos", numero: true },
    { clave: "importe", etiqueta: "Importe", numero: true, formato: formatearImporte },
    { clave: "porcentaje", etiqueta: "%", numero: true, formato: (v) => formatearPorcentaje(v, total) },
  ];
}

// La tabla de Tarjeta lee f[c.clave]: la columna % reutiliza el importe
const filasConPorcentaje = (filas) => filas.map((f) => ({ ...f, porcentaje: f.importe }));

const barras = (filas, serie = () => "importe") =>
  filas.map((f) => ({ clave: f.clave, num: f.num, segmentos: { [serie(f)]: f.importe } }));

// --- Budget goal ---

function Objetivo({ anio, objetivo, editable, onGuardado }) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState("");
  const [error, setError] = useState(null);
  const { call, loading } = useFrappePostCall("prototipo.api.panel.guardar_objetivo");

  const empezar = () => {
    setValor(objetivo ?? "");
    setError(null);
    setEditando(true);
  };

  const guardar = async (e) => {
    e.preventDefault();
    try {
      await call({ anio, importe: Number(valor) || 0 });
      setEditando(false);
      onGuardado();
    } catch (err) {
      setError(mensajeDeError(err));
    }
  };

  if (editando) {
    return (
      <form onSubmit={guardar} className="flex flex-wrap items-end gap-2">
        <div className="w-48">
          <CampoImporte
            etiqueta={`Budget goal ${anio}`}
            valor={valor}
            onChange={setValor}
            clases={ESTILOS.claro}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-salvia-900 px-4 py-2 text-sm font-semibold text-salvia-200 hover:bg-salvia hover:text-salvia-950 disabled:opacity-40"
        >
          Guardar
        </button>
        <button
          type="button"
          onClick={() => setEditando(false)}
          className="rounded-lg px-3 py-2 text-sm font-medium text-salvia-950/60 hover:bg-salvia-900/5 hover:text-salvia-950"
        >
          Cancelar
        </button>
        {error && <p className="w-full text-xs text-red-600">{error}</p>}
      </form>
    );
  }

  return (
    <div className="text-right">
      <p className="text-xs font-semibold uppercase tracking-wider text-salvia-950/60">
        Budget goal {anio}
      </p>
      <div className="flex items-center justify-end gap-2">
        <p className="text-2xl font-bold tracking-tight tabular-nums">
          {objetivo == null ? "Sin definir" : formatearImporte(objetivo)}
        </p>
        {editable && (
          <button
            type="button"
            onClick={empezar}
            className="rounded-md px-2 py-1 text-xs font-medium text-salvia-950/60 hover:bg-salvia-900/5 hover:text-salvia-950"
          >
            {objetivo == null ? "Definir" : "Cambiar"}
          </button>
        )}
      </div>
    </div>
  );
}

// --- Bloque 1: cartera viva ---

function CarteraViva({ cartera, onObjetivoGuardado }) {
  const { anio, objetivo, importe_total, num_total, importe_anio, num_anio } = cartera;

  return (
    <section className="rounded-xl border border-salvia-900/10 bg-salvia-900/[0.03] p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold">Cartera viva</h2>
          <p className="mt-0.5 text-xs text-salvia-950/50">
            Proyectos aceptados frente al objetivo del año
          </p>
        </div>
        <Objetivo
          anio={anio}
          objetivo={objetivo}
          editable={cartera.puede_editar_objetivo}
          onGuardado={onObjetivoGuardado}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Indicador
          etiqueta="Importe total"
          valor={formatearImporte(importe_total)}
          detalle={`${plural(num_total, "proyecto aceptado", "proyectos aceptados")}, importe completo sin límite de año`}
        />
        <Indicador
          etiqueta={`Importe ${anio}`}
          valor={formatearImporte(importe_anio)}
          detalle={`Parte de ${anio} de ${plural(num_anio, "proyecto aceptado o cerrado", "proyectos aceptados o cerrados")}`}
        />
        <Indicador
          etiqueta="% de previsión"
          valor={formatearPorcentaje(importe_anio, objetivo)}
          detalle={
            objetivo
              ? `${formatearImporte(importe_anio)} de ${formatearImporte(objetivo)}`
              : `Define el budget goal de ${anio} para calcularlo`
          }
        >
          <Medidor parte={importe_anio} total={objetivo || 0} etiqueta="Previsión sobre el budget goal" />
        </Indicador>
      </div>
    </section>
  );
}

// --- Bloque 2: pipeline del año ---

function PorCliente({ filas, total, anio }) {
  const [verTodos, setVerTodos] = useState(false);
  const visibles = verTodos ? filas : filas.slice(0, MAX_CLIENTES);

  return (
    <Tarjeta
      titulo={verTodos ? "Por cliente" : `Top ${MAX_CLIENTES} clientes`}
      subtitulo={`Importe aceptado en ${anio} · % sobre el total del año`}
      tabla={{ columnas: columnasReparto("Cliente", total), filas: filasConPorcentaje(filas) }}
    >
      <BarrasHorizontales filas={barras(visibles)} series={["importe"]} total={total} anchoEtiqueta="w-40" />
      {filas.length > MAX_CLIENTES && (
        <button
          type="button"
          onClick={() => setVerTodos((v) => !v)}
          className="mt-4 text-sm font-medium text-salvia-950/60 underline-offset-4 hover:text-salvia-950 hover:underline"
        >
          {verTodos ? `Ver solo los ${MAX_CLIENTES} primeros` : `Ver todos (${filas.length})`}
        </button>
      )}
    </Tarjeta>
  );
}

function Pipeline({ pipeline, onCambiarAnio }) {
  const { anio, anios, por_estado, por_cliente, por_tipo } = pipeline;
  const aceptado = por_estado.find((e) => e.estado === "Aceptado")?.importe ?? 0;

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-bold">Pipeline</h2>
        <select
          aria-label="Año del pipeline"
          value={anio}
          onChange={(e) => onCambiarAnio(Number(e.target.value))}
          className="rounded-full border-0 bg-salvia-900 px-4 py-1.5 text-sm font-semibold text-salvia-200 focus:ring-2 focus:ring-salvia"
        >
          {anios.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      <Tarjeta
        titulo="Por estado"
        subtitulo={`Importe de ${anio} · nº de proyectos en gris. Sin fechas de inicio y fin, todo el importe cuenta en el año de alta.`}
        tabla={{
          columnas: [
            { clave: "estado", etiqueta: "Estado" },
            { clave: "descripcion", etiqueta: "Qué cuenta" },
            { clave: "num", etiqueta: "Proyectos", numero: true },
            { clave: "importe", etiqueta: "Importe", numero: true, formato: formatearImporte },
          ],
          filas: por_estado.map((e) => ({ ...e, descripcion: DESCRIPCION_ESTADO[e.estado] })),
        }}
      >
        <BarrasHorizontales
          series={["importe", "rechazado"]}
          filas={barras(
            por_estado.map((e) => ({ ...e, clave: e.estado })),
            (f) => (f.clave === "Rechazado" ? "rechazado" : "importe")
          )}
        />
        <dl className="mt-4 grid gap-x-6 gap-y-1 text-xs text-salvia-950/50 sm:grid-cols-2">
          {por_estado.map((e) => (
            <div key={e.estado}>
              <dt className="inline font-semibold text-salvia-950/70">{e.estado}:</dt>{" "}
              <dd className="inline">{DESCRIPCION_ESTADO[e.estado].toLowerCase()}</dd>
            </div>
          ))}
        </dl>
      </Tarjeta>

      <div className="grid gap-6 lg:grid-cols-2">
        <PorCliente filas={por_cliente} total={aceptado} anio={anio} />
        <Tarjeta
          titulo="Por tipo de contrato"
          subtitulo={`Importe aceptado en ${anio} · % sobre el total del año`}
          tabla={{ columnas: columnasReparto("Tipo", aceptado), filas: filasConPorcentaje(por_tipo) }}
        >
          <BarrasHorizontales filas={barras(por_tipo)} series={["importe"]} total={aceptado} />
          <div className="mt-4 flex justify-between border-t border-salvia-900/10 pt-3 text-sm font-semibold">
            <span>Total {anio}</span>
            <span className="tabular-nums">{formatearImporte(aceptado)}</span>
          </div>
        </Tarjeta>
      </div>
    </section>
  );
}

// Contenido del dashboard del CEO (antes, página "Panel"): cartera viva y pipeline del año.
// El título lo pone la plantilla del dashboard (dashboard/PlantillaDashboard.jsx).
export default function Panel() {
  const [anio, setAnio] = useState(null);
  const { data, error, isLoading, mutate } = useFrappeGetCall(
    "prototipo.api.panel.obtener_panel",
    anio ? { anio } : undefined
  );

  // Al cambiar de año se conservan los datos anteriores mientras llegan los nuevos
  const [anteriores, setAnteriores] = useState(null);
  if (data && data !== anteriores) setAnteriores(data);
  const datos = data ?? anteriores;

  if (!datos && isLoading) {
    return <p className="text-sm text-salvia-950/50">Cargando dashboard…</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">Error al cargar el dashboard: {mensajeDeError(error)}</p>;
  }

  const { cartera, pipeline } = datos.message;

  return (
    <div className="space-y-8">
      <CarteraViva cartera={cartera} onObjetivoGuardado={() => mutate()} />
      <Pipeline pipeline={pipeline} onCambiarAnio={setAnio} />
    </div>
  );
}
