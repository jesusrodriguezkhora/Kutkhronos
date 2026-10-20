import { useFrappeGetCall } from "frappe-react-sdk";
import { mensajeDeError } from "../lib/errores";
import { formatearImporte, formatearPorcentaje } from "../lib/formato";
import { BarrasHorizontales, ColumnasMes, Indicador, Leyenda, Medidor, Tarjeta } from "./graficos";
import { SERIE_DE_ESTADO, etiquetaMes } from "./series";

const SERIES_REPARTO = ["ganado", "oportunidad"];
const SERIES_ESTADO = ["ganado", "oportunidad", "rechazado"];

// Columnas de la vista en tabla de los repartos (tipo, vía, cliente)
function columnasReparto(etiqueta) {
  return [
    { clave: "clave", etiqueta },
    { clave: "num", etiqueta: "Proyectos", numero: true },
    { clave: "ganado", etiqueta: "Ganado", numero: true, formato: formatearImporte },
    { clave: "oportunidad", etiqueta: "En oportunidad", numero: true, formato: formatearImporte },
  ];
}

// Filas del servidor → filas de BarrasHorizontales
const filasReparto = (filas) =>
  filas.map((f) => ({
    clave: f.clave,
    num: f.num,
    segmentos: { ganado: f.ganado, oportunidad: f.oportunidad },
  }));

function Reparto({ titulo, etiqueta, filas, className }) {
  return (
    <Tarjeta
      titulo={titulo}
      subtitulo="Importe ganado y en oportunidad, sin los rechazados · nº de proyectos en gris"
      leyenda={<Leyenda series={SERIES_REPARTO} />}
      tabla={{ columnas: columnasReparto(etiqueta), filas }}
      className={className}
    >
      <BarrasHorizontales filas={filasReparto(filas)} series={SERIES_REPARTO} />
    </Tarjeta>
  );
}

function AcuerdosMarco({ acuerdos }) {
  return (
    <section className="overflow-hidden rounded-xl border border-salvia-900/10 bg-white">
      <div className="p-5 pb-3">
        <h2 className="text-sm font-bold">Acuerdos marco</h2>
        <p className="mt-0.5 text-xs text-salvia-950/50">
          Saldo consumido por sus contratos basados aceptados, en curso o cerrados
        </p>
      </div>
      {acuerdos.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-salvia-950/50">No hay acuerdos marco.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-y border-salvia-900/10 bg-salvia-50 text-left text-xs uppercase tracking-wider text-salvia-950/50">
                <th className="px-5 py-2 font-semibold">Código</th>
                <th className="py-2 font-semibold">Cliente</th>
                <th className="py-2 font-semibold">Estado</th>
                <th className="py-2 text-right font-semibold">Importe</th>
                <th className="w-56 px-5 py-2 font-semibold">Consumido</th>
                <th className="py-2 text-right font-semibold">Disponible</th>
                <th className="px-5 py-2 text-right font-semibold">Basados</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-salvia-900/5">
              {acuerdos.map((a) => (
                <tr key={a.name}>
                  <td className="whitespace-nowrap px-5 py-3 font-mono">{a.name}</td>
                  <td className="py-3">{a.cliente || "—"}</td>
                  <td className="py-3 text-salvia-950/70">{a.estado}</td>
                  <td className="py-3 text-right tabular-nums">{formatearImporte(a.importe)}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <Medidor
                          parte={a.consumido}
                          total={a.importe}
                          etiqueta={`Consumido de ${a.name}`}
                          className=""
                        />
                      </div>
                      <span className="w-10 text-right text-xs tabular-nums text-salvia-950/60">
                        {formatearPorcentaje(a.consumido, a.importe)}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 text-right font-medium tabular-nums">
                    {formatearImporte(a.disponible)}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">{a.contratos_basados}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function Panel() {
  const { data, error, isLoading } = useFrappeGetCall("prototipo.api.panel.obtener_panel");

  const cabecera = (
    <div className="mb-6">
      <h1 className="text-3xl font-bold tracking-tight">Panel</h1>
      <p className="mt-1 text-sm text-salvia-950/50">
        Resumen del pipeline de proyectos. Los importes suman los proyectos principales: los
        contratos basados ya cuentan dentro de su acuerdo marco.
      </p>
    </div>
  );

  if (isLoading) {
    return (
      <section>
        <p className="text-sm text-salvia-950/50">Cargando panel…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section>
        <p className="text-sm text-red-600">Error al cargar el panel: {mensajeDeError(error)}</p>
      </section>
    );
  }

  const panel = data.message;
  const { oportunidad, cartera, cerrado, tasa_exito, acuerdos } = panel.indicadores;
  const hayProyectos = panel.por_estado.some((e) => e.num > 0);

  if (!hayProyectos) {
    return (
      <section>
        <p className="text-sm text-salvia-950/50">Todavía no hay proyectos.</p>
      </section>
    );
  }

  const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

  return (
    <section className="space-y-6">
      
      {/* Indicadores */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Indicador
          etiqueta="Pipeline abierto"
          valor={formatearImporte(oportunidad.importe)}
          detalle={plural(oportunidad.num, "oportunidad", "oportunidades")}
        />
        <Indicador
          etiqueta="Cartera viva"
          valor={formatearImporte(cartera.importe)}
          detalle={`${plural(cartera.num, "proyecto", "proyectos")} aceptados o en curso`}
        />
        <Indicador
          etiqueta="Cerrado"
          valor={formatearImporte(cerrado.importe)}
          detalle={plural(cerrado.num, "proyecto terminado", "proyectos terminados")}
        />
        <Indicador
          etiqueta="Tasa de éxito"
          valor={formatearPorcentaje(tasa_exito.ganados, tasa_exito.decididos)}
          detalle={`${tasa_exito.ganados} ganados de ${tasa_exito.decididos} decididos`}
        >
          <Medidor
            parte={tasa_exito.ganados}
            total={tasa_exito.decididos}
            etiqueta="Tasa de éxito"
          />
        </Indicador>
        <Indicador
          etiqueta="Saldo en acuerdos marco"
          valor={formatearImporte(acuerdos.disponible)}
          detalle={`${formatearPorcentaje(acuerdos.consumido, acuerdos.importe)} consumido de ${formatearImporte(acuerdos.importe)}`}
        >
          <Medidor
            parte={acuerdos.consumido}
            total={acuerdos.importe}
            etiqueta="Consumido de los acuerdos marco"
          />
        </Indicador>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Tarjeta
          titulo="Proyectos por estado"
          subtitulo="Importe · nº de proyectos en gris"
          leyenda={<Leyenda series={SERIES_ESTADO} />}
          tabla={{
            columnas: [
              { clave: "estado", etiqueta: "Estado" },
              { clave: "num", etiqueta: "Proyectos", numero: true },
              { clave: "importe", etiqueta: "Importe", numero: true, formato: formatearImporte },
            ],
            filas: panel.por_estado,
          }}
        >
          <BarrasHorizontales
            series={SERIES_ESTADO}
            filas={panel.por_estado.map((e) => ({
              clave: e.estado,
              num: e.num,
              segmentos: { [SERIE_DE_ESTADO[e.estado]]: e.importe },
            }))}
          />
        </Tarjeta>

        <Tarjeta
          titulo="Altas por mes"
          subtitulo="Importe de los proyectos dados de alta en los últimos 12 meses"
          tabla={{
            columnas: [
              { clave: "mes", etiqueta: "Mes", formato: (m) => etiquetaMes(m, true) },
              { clave: "num", etiqueta: "Altas", numero: true },
              { clave: "importe", etiqueta: "Importe", numero: true, formato: formatearImporte },
            ],
            filas: panel.por_mes,
          }}
        >
          <ColumnasMes meses={panel.por_mes} />
        </Tarjeta>

        <Reparto titulo="Por cliente" etiqueta="Cliente" filas={panel.por_cliente} />

        <div className="grid gap-6">
          <Reparto titulo="Por tipo" etiqueta="Tipo" filas={panel.por_tipo} />
          <Reparto titulo="Por vía" etiqueta="Vía" filas={panel.por_via} />
        </div>
      </div>

      <AcuerdosMarco acuerdos={panel.acuerdos_marco} />
    </section>
  );
}
