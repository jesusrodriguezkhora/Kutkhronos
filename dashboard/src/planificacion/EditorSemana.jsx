import { useEffect, useState } from "react";
import { useFrappePostCall } from "frappe-react-sdk";
import TablaPlanificacion from "./TablaPlanificacion";
import CampoHoras from "./CampoHoras";
import BuscadorProyecto from "./BuscadorProyecto";
import {
  aplanarCeldas,
  calcularTotales,
  esMediaHora,
  formatearHoras,
  indexarCeldas,
  superaMaximo,
} from "./calculo";
import { formatearFecha } from "../lib/formato";
import { mensajeDeError } from "../lib/errores";

// "2026-10-21 10:37:00.123" -> "21/10/2026 a las 10:37"
function fechaYHora(valor) {
  const [fecha, hora] = valor.split(" ");
  return `${formatearFecha(fecha)} a las ${hora.slice(0, 5)}`;
}

function estadoInicial(info) {
  return { filas: info.filas, indice: indexarCeldas(info.celdas) };
}

// Lo que se guardaría, en un orden estable: para saber si hay cambios
function resumen(estado, conceptos) {
  const celdas = aplanarCeldas(estado.indice, conceptos)
    .map((c) => `${c.concepto}|${c.proyecto ?? ""}|${c.empleado}|${c.horas}`)
    .sort();
  return JSON.stringify([estado.filas.map((f) => f.name), celdas]);
}

const BOTON_SECUNDARIO =
  "rounded-lg border border-dashed border-salvia-900/30 px-3 py-1.5 text-sm font-medium text-salvia-950/70 hover:border-salvia-900 hover:bg-salvia hover:text-salvia-950 disabled:cursor-not-allowed disabled:opacity-40";

// Tabla de una semana con su edición. Se monta de nuevo (key) al cambiar de semana o tras guardar.
export default function EditorSemana({ info, lunes, onGuardado, onCambiosPendientes }) {
  const conceptos = info.conceptos_administracion;
  const editable = info.semana.editable;

  const [estado, setEstado] = useState(() => estadoInicial(info));
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);
  const { call: llamarGuardar, loading: guardando } = useFrappePostCall(
    "prototipo.api.planificacion.guardar_semana"
  );
  const { call: llamarCopiar, loading: copiando } = useFrappePostCall(
    "prototipo.api.planificacion.copiar_semana_anterior"
  );

  const hayCambios = resumen(estado, conceptos) !== resumen(estadoInicial(info), conceptos);

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

  // --- Cambios en la tabla ---

  const cambiarCelda = (fila, empleado, horas) =>
    setEstado((e) => ({
      ...e,
      indice: { ...e.indice, [fila]: { ...e.indice[fila], [empleado]: horas } },
    }));

  const anadirFila = (proyecto) => setEstado((e) => ({ ...e, filas: [...e.filas, proyecto] }));

  const quitarFila = (nombre) =>
    setEstado((e) => {
      const { [nombre]: _quitada, ...resto } = e.indice;
      return { filas: e.filas.filter((f) => f.name !== nombre), indice: resto };
    });

  // Vacaciones y formación: solo Administración. Las semanas pasadas no se editan.
  const puedeEditar = (fila) => editable && (!conceptos.includes(fila) || info.puede_editar_administracion);

  const renderCelda = (fila, empleado, horas) =>
    puedeEditar(fila) ? (
      <CampoHoras
        valor={horas}
        onChange={(h) => cambiarCelda(fila, empleado.usuario, h)}
        etiqueta={`Horas de ${empleado.nombre} en ${fila}`}
      />
    ) : (
      formatearHoras(horas)
    );

  // --- Lo que impide guardar (el servidor lo vuelve a comprobar) ---

  const claves = [...estado.filas.map((f) => f.name), ...conceptos];
  const totales = calcularTotales(estado.indice, claves, info.empleados);
  const excedidos = info.empleados.filter((e) => superaMaximo(totales.porEmpleado[e.usuario], e.maximo));
  const horasInvalidas = Object.values(estado.indice).some((porEmpleado) =>
    Object.values(porEmpleado).some((h) => h < 0 || !esMediaHora(h))
  );

  // --- Acciones ---

  const copiarSemanaAnterior = async () => {
    if (
      estado.filas.length > 0 &&
      !window.confirm("Se sustituirán los proyectos de esta semana por los de la semana anterior. ¿Continuar?")
    ) {
      return;
    }
    setError(null);
    setAviso(null);
    try {
      const copia = (await llamarCopiar({ lunes })).message;
      setEstado((e) => {
        // Vacaciones y formación de esta semana se mantienen; los proyectos se sustituyen
        const indice = Object.fromEntries(conceptos.filter((c) => e.indice[c]).map((c) => [c, e.indice[c]]));
        for (const c of copia.celdas) {
          indice[c.proyecto] = { ...indice[c.proyecto], [c.empleado]: c.horas };
        }
        return { filas: copia.filas, indice };
      });
      if (copia.proyectos_omitidos.length) {
        setAviso(
          `No se han copiado ${copia.proyectos_omitidos.join(", ")}: ya no están aceptados ni en curso.`
        );
      }
    } catch (err) {
      setError(mensajeDeError(err));
    }
  };

  const guardar = async () => {
    setError(null);
    setAviso(null);
    try {
      const respuesta = await llamarGuardar({
        lunes,
        filas: estado.filas.map((f) => f.name),
        celdas: aplanarCeldas(estado.indice, conceptos),
        modificado: info.modificado,
      });
      onGuardado(respuesta.message);
    } catch (err) {
      setError(mensajeDeError(err));
    }
  };

  const descartar = () => {
    setEstado(estadoInicial(info));
    setError(null);
    setAviso(null);
  };

  let motivoNoGuardar;
  if (excedidos.length) motivoNoGuardar = "Hay personas por encima de su máximo";
  else if (horasInvalidas) motivoNoGuardar = "Hay horas que no son medias horas";

  return (
    <div className="space-y-4">
      <TablaPlanificacion
        filas={estado.filas}
        conceptos={conceptos}
        empleados={info.empleados}
        indice={estado.indice}
        renderCelda={renderCelda}
        onQuitarFila={editable ? quitarFila : undefined}
      />

      {editable && (
        <div className="flex flex-wrap items-center gap-3">
          <BuscadorProyecto excluir={estado.filas.map((f) => f.name)} onElegir={anadirFila} />
          {info.hay_semana_anterior && (
            <button type="button" onClick={copiarSemanaAnterior} disabled={copiando} className={BOTON_SECUNDARIO}>
              {copiando ? "Copiando…" : "Copiar semana anterior"}
            </button>
          )}
        </div>
      )}

      {excedidos.length > 0 && (
        <p className="text-sm text-red-700">
          Por encima de su máximo: {excedidos.map((e) => e.nombre).join(", ")}.
        </p>
      )}
      {aviso && <p className="text-sm text-salvia-950/70">{aviso}</p>}
      {error && (
        <p className="whitespace-pre-line rounded-lg border-l-4 border-salvia-900 bg-salvia-100 px-3 py-2 text-sm text-salvia-950">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-salvia-900/10 pt-4">
        <p className="text-xs text-salvia-950/50">
          {!editable && <span className="font-semibold text-salvia-950/70">Semana pasada, solo lectura · </span>}
          {info.modificado
            ? `Última edición el ${fechaYHora(info.modificado)} por ${info.modificado_por}.`
            : editable
              ? "Esta semana todavía no se ha planificado."
              : "Esta semana no se planificó."}
        </p>

        {editable && (
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
      </div>
    </div>
  );
}