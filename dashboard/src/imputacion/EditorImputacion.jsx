import { useEffect, useState } from "react";
import { useFrappePostCall } from "frappe-react-sdk";
import TablaImputacion from "./TablaImputacion";
import CampoHoras from "../planificacion/CampoHoras";
import BuscadorProyecto from "../planificacion/BuscadorProyecto";
import { esMediaHora, formatearHoras } from "../planificacion/calculo";
import {
  CONCEPTO_PROYECTO,
  CONCEPTO_VACACIONES,
  MAXIMO_DIARIO,
  calcularTotales,
  filasDe,
  indexarCeldas,
  ultimoDiaParaImputar,
  vacacionesPorDia,
} from "./calculo";
import { formatearFecha } from "../lib/formato";
import { mensajeDeError } from "../lib/errores";

const diaYMes = (fecha) => `${fecha.slice(8, 10)}/${fecha.slice(5, 7)}`;

// indice: {fila: {fecha: horas}}; teletrabajo: días marcados; anadidos: proyectos añadidos con el buscador
function estadoInicial(info) {
  return { indice: indexarCeldas(info.celdas), teletrabajo: [...info.teletrabajo].sort(), anadidos: [] };
}

function filaAnadida(proyecto) {
  return {
    clave: proyecto.name,
    titulo: proyecto.name,
    subtitulo: [proyecto.cliente, proyecto.descripcion].filter(Boolean).join(" · "),
    planificado: 0,
    concepto: CONCEPTO_PROYECTO,
  };
}

// Filas imputables + índice -> celdas para la API (solo las que tienen horas; las vacaciones no se envían)
function aplanar(filas, indice) {
  const celdas = [];
  for (const f of filas) {
    if (f.soloLectura) continue;
    for (const [fecha, horas] of Object.entries(indice[f.clave] ?? {})) {
      if (horas) {
        celdas.push({ concepto: f.concepto, proyecto: f.concepto === CONCEPTO_PROYECTO ? f.clave : null, fecha, horas });
      }
    }
  }
  return celdas;
}

// Lo que se guardaría, en un orden estable: para saber si hay cambios
function resumen(filas, estado) {
  const celdas = aplanar(filas, estado.indice)
    .map((c) => `${c.concepto}|${c.proyecto ?? ""}|${c.fecha}|${c.horas}`)
    .sort();
  return JSON.stringify([celdas, [...estado.teletrabajo].sort()]);
}

// Pie bajo la tabla, como en planificación: estado de la semana y botones
function PieSemana({ semana, children }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-salvia-900/10 pt-4">
      <p className="text-xs text-salvia-950/50">
        {semana.cerrada ? (
          <span className="font-semibold text-salvia-950/70">Semana cerrada, solo lectura.</span>
        ) : (
          <>
            <span className="font-semibold text-salvia-950/70">
              Puedes imputar hasta el {formatearFecha(ultimoDiaParaImputar(semana.cierre))} incluido
            </span>
            {" · "}solo los días que ya han pasado.
          </>
        )}
      </p>
      {children}
    </div>
  );
}

// Imputación de una semana con su edición. Se monta de nuevo (key) al cambiar de semana o tras guardar.
export default function EditorImputacion({ info, lunes, onGuardado, onCambiosPendientes }) {
  const semana = info.semana;
  const [estado, setEstado] = useState(() => estadoInicial(info));
  const [error, setError] = useState(null);
  const { call: llamarGuardar, loading: guardando } = useFrappePostCall(
    "prototipo.api.imputacion.guardar_semana"
  );

  // Proyectos (planificados, imputados y añadidos), luego las filas fijas y las vacaciones
  const base = filasDe(info);
  const filas = [
    ...base.filter((f) => !f.fija),
    ...estado.anadidos.map(filaAnadida),
    ...base.filter((f) => f.fija),
  ];
  const indice = { ...estado.indice, [CONCEPTO_VACACIONES]: vacacionesPorDia(semana.dias) };

  const hayCambios = resumen(filas, estado) !== resumen(filas, estadoInicial(info));

  useEffect(() => {
    onCambiosPendientes(hayCambios);
  }, [hayCambios, onCambiosPendientes]);

  // Avisar si se cierra o recarga la pestaña con cambios sin guardar
  useEffect(() => {
    if (!hayCambios) return;
    const alSalir = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", alSalir);
    return () => window.removeEventListener("beforeunload", alSalir);
  }, [hayCambios]);

  // --- Cambios ---

  const cambiarCelda = (fila, fecha, horas) =>
    setEstado((e) => ({ ...e, indice: { ...e.indice, [fila]: { ...e.indice[fila], [fecha]: horas } } }));

  const cambiarTeletrabajo = (fecha, marcado) =>
    setEstado((e) => ({
      ...e,
      teletrabajo: marcado ? [...e.teletrabajo, fecha].sort() : e.teletrabajo.filter((f) => f !== fecha),
    }));

  const anadirProyecto = (proyecto) => setEstado((e) => ({ ...e, anadidos: [...e.anadidos, proyecto] }));

  // Horas imputadas en un día (sin vacaciones)
  const imputadoEl = (fecha) =>
    filas.filter((f) => !f.soloLectura).reduce((total, f) => total + (estado.indice[f.clave]?.[fecha] || 0), 0);

  // --- Lo que impide guardar (el servidor lo vuelve a comprobar) ---

  const totales = calcularTotales(indice, filas, semana.dias);
  const horasInvalidas = Object.values(estado.indice).some((porDia) =>
    Object.values(porDia).some((h) => h < 0 || !esMediaHora(h))
  );
  const diasExcedidos = semana.dias.filter((d) => totales.porDia[d.fecha] > MAXIMO_DIARIO + 1e-9);
  const teletrabajoSinHoras = estado.teletrabajo.filter((fecha) => !imputadoEl(fecha));

  let motivoNoGuardar;
  if (horasInvalidas) motivoNoGuardar = "Hay horas que no son medias horas";
  else if (diasExcedidos.length) motivoNoGuardar = `Hay días con más de ${MAXIMO_DIARIO} h`;
  else if (teletrabajoSinHoras.length) motivoNoGuardar = "Hay días con teletrabajo y sin horas";

  // --- Celdas y casillas ---

  const renderCelda = (fila, dia, horas) =>
    !fila.soloLectura && dia.editable ? (
      <CampoHoras
        valor={horas}
        onChange={(h) => cambiarCelda(fila.clave, dia.fecha, h)}
        etiqueta={`Horas de ${fila.titulo} el ${dia.nombre}`}
      />
    ) : (
      formatearHoras(horas)
    );

  const renderTeletrabajo = (dia) => {
    const marcado = estado.teletrabajo.includes(dia.fecha);
    const sinHoras = !imputadoEl(dia.fecha);
    // Se marca en días editables con horas; si ya está marcado, siempre se puede desmarcar
    const activo = dia.editable && (!sinHoras || marcado);
    return (
      <label
        className={`inline-flex items-center gap-1.5 ${
          activo ? "cursor-pointer text-salvia-200" : "text-salvia-200/50"
        } ${marcado && sinHoras ? "text-red-300" : ""}`}
        title={dia.editable && sinHoras && !marcado ? "Imputa horas este día para marcar teletrabajo" : undefined}
      >
        <input
          type="checkbox"
          className="h-4 w-4 accent-salvia disabled:cursor-not-allowed"
          checked={marcado}
          disabled={!activo}
          onChange={(ev) => cambiarTeletrabajo(dia.fecha, ev.target.checked)}
        />
        Teletrabajo
      </label>
    );
  };

  // --- Acciones ---

  const guardar = async () => {
    setError(null);
    try {
      const respuesta = await llamarGuardar({
        lunes,
        celdas: aplanar(filas, estado.indice),
        teletrabajo: estado.teletrabajo,
      });
      onGuardado(respuesta.message);
    } catch (err) {
      setError(mensajeDeError(err));
    }
  };

  const descartar = () => {
    setEstado(estadoInicial(info));
    setError(null);
  };

  return (
    <div className="space-y-4">
      <TablaImputacion
        filas={filas}
        dias={semana.dias}
        indice={indice}
        teletrabajo={estado.teletrabajo}
        renderCelda={renderCelda}
        renderTeletrabajo={renderTeletrabajo}
      />

      {semana.editable && (
        <BuscadorProyecto
          metodo="prototipo.api.imputacion.buscar_proyectos"
          excluir={filas.filter((f) => f.concepto === CONCEPTO_PROYECTO).map((f) => f.clave)}
          onElegir={anadirProyecto}
        />
      )}

      {diasExcedidos.length > 0 && (
        <p className="text-sm text-red-700">
          Más de {MAXIMO_DIARIO} h: {diasExcedidos.map((d) => `${d.nombre} ${diaYMes(d.fecha)}`).join(", ")}.
        </p>
      )}
      {teletrabajoSinHoras.length > 0 && (
        <p className="text-sm text-red-700">
          Teletrabajo sin horas: {teletrabajoSinHoras.map(diaYMes).join(", ")}. Imputa horas o desmarca el
          teletrabajo.
        </p>
      )}
      {error && (
        <p className="whitespace-pre-line rounded-lg border-l-4 border-salvia-900 bg-salvia-100 px-3 py-2 text-sm text-salvia-950">
          {error}
        </p>
      )}

      <PieSemana semana={semana}>
        {semana.editable && (
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
            <button
              type="button"
              onClick={guardar}
              disabled={!hayCambios || guardando || !!motivoNoGuardar}
              title={motivoNoGuardar}
              className="rounded-lg bg-salvia-900 px-5 py-2 text-sm font-semibold text-salvia-200 hover:bg-salvia hover:text-salvia-950 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {guardando ? "Guardando…" : "Guardar"}
            </button>
          </div>
        )}
      </PieSemana>
    </div>
  );
}