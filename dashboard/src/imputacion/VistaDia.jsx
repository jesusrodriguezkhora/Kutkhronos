import { useState } from "react";
import CampoHoras from "../planificacion/CampoHoras";
import BotonComentario from "../planificacion/BotonComentario";
import PopupComentario from "../planificacion/PopupComentario";
import { aISO, formatearHoras } from "../planificacion/calculo";
import { MAXIMO_DIARIO, calcularTotales } from "./calculo";

const INICIAL = { lunes: "L", martes: "M", miércoles: "X", jueves: "J", viernes: "V" };
const diaYMes = (fecha) => `${Number(fecha.slice(8, 10))}/${Number(fecha.slice(5, 7))}`;
const conMayuscula = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1);

// Día que se abre por defecto: hoy si es de esta semana; si no, el lunes
export function diaPorDefecto(dias) {
  const hoy = aISO(new Date());
  return dias.some((d) => d.fecha === hoy) ? hoy : dias[0].fecha;
}

// Por qué no se puede cargar un día (null si se puede)
function motivoBloqueo(dia, cerrada) {
  if (dia.festivo) return `Festivo · ${dia.festivo}`;
  if (dia.vacaciones) return "Vacaciones";
  if (cerrada) return "Semana cerrada, solo lectura.";
  if (!dia.editable) return "Este día todavía no ha llegado.";
  return null;
}

// Carga de horas en móvil: un día cada vez, elegido con los botones L M X J V.
// Solo pinta: el estado y las reglas son los de EditorImputacion.
export default function VistaDia({
  semana,
  filas,
  indice,
  teletrabajo,
  diaElegido,
  onElegirDia,
  onCambiarCelda,
  onCambiarTeletrabajo,
}) {
  const [comentarioAbierto, setComentarioAbierto] = useState(null);
  const dias = semana.dias;
  const fecha = dias.some((d) => d.fecha === diaElegido) ? diaElegido : diaPorDefecto(dias);
  const dia = dias.find((d) => d.fecha === fecha);

  const totales = calcularTotales(indice, filas, dias);
  const total = totales.porDia[fecha];
  const excede = total > MAXIMO_DIARIO + 1e-9;
  const bloqueo = motivoBloqueo(dia, semana.cerrada);

  // Teletrabajo: mismas reglas que en escritorio (día editable con horas; si está marcado, se puede desmarcar)
  const marcado = teletrabajo.includes(fecha);
  const puedeTeletrabajo = dia.editable && (total > 0 || marcado);

  return (
    <div className="space-y-4">
      {/* Botones de día */}
      <div role="tablist" aria-label="Día de la semana" className="grid grid-cols-5 gap-1.5">
        {dias.map((d) => {
          const elegido = d.fecha === fecha;
          const apagado = d.festivo || d.vacaciones;
          const horas = totales.porDia[d.fecha];
          return (
            <button
              key={d.fecha}
              type="button"
              role="tab"
              aria-selected={elegido}
              aria-label={`${conMayuscula(d.nombre)} ${diaYMes(d.fecha)}`}
              onClick={() => onElegirDia(d.fecha)}
              className={`flex flex-col items-center rounded-xl py-2 transition-colors ${
                elegido
                  ? "bg-salvia-900 text-salvia-200"
                  : apagado
                    ? "bg-salvia-900/5 text-salvia-950/40"
                    : "bg-white text-salvia-950 ring-1 ring-salvia-900/10"
              }`}
            >
              <span className="text-sm font-bold">{INICIAL[d.nombre]}</span>
              <span className="text-xs opacity-70">{diaYMes(d.fecha)}</span>
            </button>
          );
        })}
      </div>

      {/* Día elegido: título y teletrabajo */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">
          {conMayuscula(dia.nombre)} {diaYMes(fecha)}
        </h2>
        {!dia.festivo && !dia.vacaciones && (
          <label
            className={`inline-flex items-center gap-2 text-sm ${
              puedeTeletrabajo ? "text-salvia-950" : "text-salvia-950/40"
            } ${marcado && !total ? "text-red-700" : ""}`}
          >
            <input
              type="checkbox"
              className="h-5 w-5 accent-salvia-900 disabled:cursor-not-allowed"
              checked={marcado}
              disabled={!puedeTeletrabajo}
              onChange={(ev) => onCambiarTeletrabajo(fecha, ev.target.checked)}
            />
            Teletrabajo
          </label>
        )}
      </div>

      {bloqueo && (
        <p className="rounded-lg bg-salvia-900/5 px-3 py-2 text-sm text-salvia-950/60">{bloqueo}</p>
      )}

      {/* Filas: proyectos y filas fijas, con su campo de horas a la derecha */}
      <ul className="divide-y divide-salvia-900/10 overflow-hidden rounded-xl border border-salvia-900/10 bg-white">
        {filas.map((f) => {
          const horas = indice[f.clave]?.[fecha] || 0;
          return (
            <li key={f.clave} className={`flex items-center gap-3 px-4 py-3 ${f.fija ? "bg-salvia-50" : ""}`}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <span className={f.fija ? "font-medium" : "font-mono text-sm font-medium"}>{f.titulo}</span>
                  {f.comentario && (
                    <BotonComentario
                      tieneComentario
                      onClick={() => setComentarioAbierto(f)}
                      etiqueta={`Indicaciones para ${f.titulo}`}
                    />
                  )}
                </div>
                {f.subtitulo && <div className="truncate text-xs text-salvia-950/50">{f.subtitulo}</div>}
                <div className="mt-0.5 text-xs text-salvia-950/60">
                  {f.planificado ? (
                    <>
                      Planificado <span className="font-semibold">{formatearHoras(f.planificado)} h</span> esta semana
                    </>
                  ) : (
                    "Sin planificar"
                  )}
                </div>
              </div>
              <div className="shrink-0">
                {dia.editable ? (
                  <CampoHoras
                    valor={horas}
                    onChange={(h) => onCambiarCelda(f.clave, fecha, h)}
                    etiqueta={`Horas de ${f.titulo} el ${dia.nombre}`}
                    maximo={MAXIMO_DIARIO}
                  />
                ) : (
                  <span className="tabular-nums text-salvia-950/70">{formatearHoras(horas) || "—"}</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <div
        className={`flex items-center justify-between rounded-xl px-4 py-3 font-semibold ${
          excede ? "bg-red-50 text-red-700" : "bg-salvia-100"
        }`}
      >
        <span>Total del día</span>
        <span className="tabular-nums">{formatearHoras(total) || "0"} h</span>
      </div>

      {comentarioAbierto && (
        <PopupComentario
          titulo={comentarioAbierto.titulo}
          subtitulo="Indicaciones de planificación"
          valor={comentarioAbierto.comentario}
          editable={false}
          onCerrar={() => setComentarioAbierto(null)}
        />
      )}
    </div>
  );
}