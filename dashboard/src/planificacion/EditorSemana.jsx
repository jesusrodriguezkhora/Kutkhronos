import { useEffect, useState } from "react";
import { useFrappePostCall } from "frappe-react-sdk";
import TablaPlanificacion from "./TablaPlanificacion";
import CampoHoras from "./CampoHoras";
import PopupDias from "./PopupDias";
import PopupComentario from "./PopupComentario";
import BotonComentario, { HuecoComentario } from "./BotonComentario";
import {
  aplanarCeldas,
  calcularTotales,
  esMediaHora,
  formatearHoras,
  indexarCeldas,
  superaMaximo,
  totalesDiarios,
  CONCEPTO_VACACIONES,
} from "./calculo";
import { formatearFecha } from "../lib/formato";
import { mensajeDeError } from "../lib/errores";

// "2026-10-21 10:37:00.123" -> "21/10/2026 a las 10:37"
function fechaYHora(valor) {
  const [fecha, hora] = valor.split(" ");
  return `${formatearFecha(fecha)} a las ${hora.slice(0, 5)}`;
}

// filas: proyectos de la semana; indice: horas de proyectos; diario: vacaciones y formación por día
function estadoInicial(info) {
  return { filas: info.filas, ...indexarCeldas(info.celdas) };
}

// Lo que se guardaría, en un orden estable: para saber si hay cambios
function resumen(estado) {
  const celdas = aplanarCeldas(estado.indice, estado.semanal, estado.diario, estado.comentarios)
    .map((c) => `${c.concepto}|${c.proyecto ?? ""}|${c.empleado}|${c.fecha ?? ""}|${c.horas}|${c.comentario ?? ""}`)
    .sort();
  return JSON.stringify([estado.filas.map((f) => f.name), celdas]);
}

// Celda de vacaciones o formación: muestra el total de la semana y abre el detalle por día
function BotonDias({ horas, editable, onAbrir, etiqueta }) {
  if (!horas && !editable) return "";
  return (
    <button
      type="button"
      onClick={onAbrir}
      aria-label={etiqueta}
      className="inline-flex w-16 items-center justify-center gap-1 rounded-lg border border-salvia-900/15 bg-white px-1 py-1 tabular-nums hover:border-salvia-900 hover:bg-salvia"
    >
      {horas ? formatearHoras(horas) : <span className="text-salvia-950/40">Días</span>}
      <span aria-hidden="true" className="text-xs text-salvia-950/50">
        ▾
      </span>
    </button>
  );
}

const BOTON_SECUNDARIO =
  "rounded-lg border border-dashed border-salvia-900/30 px-3 py-1.5 text-sm font-medium text-salvia-950/70 hover:border-salvia-900 hover:bg-salvia hover:text-salvia-950 disabled:cursor-not-allowed disabled:opacity-40";

// Tabla de una semana con su edición. Se monta de nuevo (key) al cambiar de semana o tras guardar.
export default function EditorSemana({ info, lunes, onGuardado, onCambiosPendientes }) {
  const conceptos = info.conceptos;
  const editable = info.semana.editable;

  const [estado, setEstado] = useState(() => estadoInicial(info));
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [popup, setPopup] = useState(null); // { concepto, empleado } del detalle por día abierto
  const [popupComentario, setPopupComentario] = useState(null); // { fila, empleado } del comentario abierto
  const { call: llamarGuardar, loading: guardando } = useFrappePostCall(
    "prototipo.api.planificacion.guardar_semana"
  );
  const { call: llamarCopiar, loading: copiando } = useFrappePostCall(
    "prototipo.api.planificacion.copiar_semana_anterior"
  );

  const hayCambios = resumen(estado) !== resumen(estadoInicial(info));

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

  const cambiarSemanal = (concepto, empleado, horas) =>
    setEstado((e) => ({
      ...e,
      semanal: { ...e.semanal, [concepto]: { ...e.semanal[concepto], [empleado]: horas } },
    }));

  const aplicarDias = (concepto, empleado, dias) => {
    setEstado((e) => ({
      ...e,
      diario: { ...e.diario, [concepto]: { ...e.diario[concepto], [empleado]: dias } },
    }));
    setPopup(null);
  };

  const aplicarComentario = (fila, empleado, texto) => {
    setEstado((e) => ({
      ...e,
      comentarios: { ...e.comentarios, [fila]: { ...e.comentarios[fila], [empleado]: texto || undefined } },
    }));
    setPopupComentario(null);
  };

  // Horas de una celda de proyecto o de concepto semanal
  const horasDe = (fila, empleado) => (estado.indice[fila] ?? estado.semanal[fila])?.[empleado] || 0;

  // Vacaciones: solo Administración. El resto de filas, cualquier rol de gestión. Las semanas cerradas no se editan.
  const puedeEditar = (fila) => editable && (fila !== CONCEPTO_VACACIONES || info.puede_editar_vacaciones);

  const renderCelda = (fila, empleado, horas) => {
    if (fila === CONCEPTO_VACACIONES) {
      return (
        <BotonDias
          horas={horas}
          editable={puedeEditar(fila)}
          onAbrir={() => setPopup({ concepto: fila, empleado })}
          etiqueta={`${fila} de ${empleado.nombre}: detalle por día`}
        />
      );
    }

    const editableCelda = puedeEditar(fila);
    const comentario = estado.comentarios[fila]?.[empleado.usuario];
    // Editable: con horas (o con un comentario que haya que borrar). Solo lectura: si hay comentario.
    const conBocadillo = editableCelda ? horas > 0 || !!comentario : !!comentario;
    const cambiar = conceptos.includes(fila) ? cambiarSemanal : cambiarCelda;

    return (
      <div className="inline-flex items-center gap-1">
        {editableCelda ? (
          <CampoHoras
            valor={horas}
            onChange={(h) => cambiar(fila, empleado.usuario, h)}
            etiqueta={`Horas de ${empleado.nombre} en ${fila}`}
          />
        ) : (
          <span>{formatearHoras(horas)}</span>
        )}
        {conBocadillo ? (
          <BotonComentario
            tieneComentario={!!comentario}
            onClick={() => setPopupComentario({ fila, empleado })}
            etiqueta={`Comentario de ${empleado.nombre} en ${fila}`}
          />
        ) : (
          <HuecoComentario />
        )}
      </div>
    );
  };

  // --- Lo que impide guardar (el servidor lo vuelve a comprobar) ---

  const indiceTabla = { ...estado.indice, ...estado.semanal, ...totalesDiarios(estado.diario) };
  const claves = [...estado.filas.map((f) => f.name), ...conceptos];
  const totales = calcularTotales(indiceTabla, claves, info.empleados);
  const excedidos = info.empleados.filter((e) => superaMaximo(totales.porEmpleado[e.usuario], e.maximo));
  const horasInvalidas = [...Object.values(estado.indice), ...Object.values(estado.semanal)].some((porEmpleado) =>
    Object.values(porEmpleado).some((h) => h < 0 || !esMediaHora(h))
  );
  const comentariosSinHoras = Object.entries(estado.comentarios).some(([fila, porEmpleado]) =>
    Object.entries(porEmpleado).some(([empleado, texto]) => texto && !horasDe(fila, empleado))
  );

  // --- Acciones ---

  const copiarSemanaAnterior = async () => {
    const hayHorasDeProyectos = Object.values(estado.indice).some((porEmpleado) =>
      Object.values(porEmpleado).some(Boolean)
    );
    if (
      hayHorasDeProyectos &&
      !window.confirm("Se sustituirán las horas de proyectos de esta semana por las de la semana anterior. ¿Continuar?")
    ) {
      return;
    }
    setError(null);
    setAviso(null);
    try {
      const copia = (await llamarCopiar({ lunes })).message;
      setEstado((e) => {
        // Se sustituyen las horas y los comentarios de proyectos. Vacaciones, formación, comercial e interno se mantienen.
        const indice = {};
        for (const c of copia.celdas) {
          indice[c.proyecto] = { ...indice[c.proyecto], [c.empleado]: c.horas };
        }
        return { ...e, indice };

        const comentarios = Object.fromEntries(
          Object.entries(e.comentarios).filter(([fila]) => conceptos.includes(fila))
        );
        return { ...e, indice, comentarios };
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
        celdas: aplanarCeldas(estado.indice, estado.semanal, estado.diario, estado.comentarios),
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
  else if (comentariosSinHoras) motivoNoGuardar = "Hay celdas con comentario y sin horas: borra antes el comentario";

  return (
    <div className="space-y-4">
      <TablaPlanificacion
        filas={estado.filas}
        conceptos={conceptos}
        empleados={info.empleados}
        indice={indiceTabla}
        renderCelda={renderCelda}
      />

      {editable && info.hay_semana_anterior && (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={copiarSemanaAnterior} disabled={copiando} className={BOTON_SECUNDARIO}>
            {copiando ? "Copiando…" : "Copiar semana anterior"}
          </button>
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
          {!editable && <span className="font-semibold text-salvia-950/70">Semana cerrada, solo lectura · </span>}
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
      {popup && (
        <PopupDias
          concepto={popup.concepto}
          empleado={popup.empleado}
          dias={info.semana.dias}
          valores={estado.diario[popup.concepto]?.[popup.empleado.usuario] ?? {}}
          editable={puedeEditar(popup.concepto)}
          onAplicar={(dias) => aplicarDias(popup.concepto, popup.empleado.usuario, dias)}
          onCerrar={() => setPopup(null)}
        />
      )}
      {popupComentario && (
        <PopupComentario
          titulo={popupComentario.fila}
          subtitulo={popupComentario.empleado.nombre}
          valor={estado.comentarios[popupComentario.fila]?.[popupComentario.empleado.usuario]}
          editable={puedeEditar(popupComentario.fila)}
          onAplicar={(texto) => aplicarComentario(popupComentario.fila, popupComentario.empleado.usuario, texto)}
          onCerrar={() => setPopupComentario(null)}
        />
      )}
    </div>
  );
}