import { useEffect, useState } from "react";
import { useFrappeGetCall } from "frappe-react-sdk";
import SelectorSemana from "./SelectorSemana";
import EditorSemana from "./EditorSemana";
import Supervision from "./Supervision";
import { primeraSemanaEditable } from "./calculo";
import { formatearFecha } from "../lib/formato";
import { mensajeDeError } from "../lib/errores";

function Avisos({ semana }) {
  return (
    <div className="space-y-2 text-sm">
      {semana.festivos.length > 0 && (
        <p className="text-salvia-950/70">
          ★ {semana.festivos.map((f) => `${formatearFecha(f.fecha)} · ${f.descripcion}`).join(" — ")}. Esta
          semana tiene {semana.dias_laborables} días laborables.
        </p>
      )}
      {semana.sin_calendario.length > 0 && (
        <p className="rounded-lg border-l-4 border-red-300 bg-red-50 px-3 py-2 text-red-700">
          Todavía no hay calendario de festivos para {semana.sin_calendario.join(" y ")}: los máximos no
          descuentan festivos.
        </p>
      )}
    </div>
  );
}

// Flecha "volver" (icono arrow-left de Heroicons, licencia MIT)
function IconoVolver() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
    </svg>
  );
}

export default function Planificacion() {
  // La pantalla abre en la primera semana editable, en el mes de su lunes
  const [lunes, setLunes] = useState(primeraSemanaEditable);
  const [anio, setAnio] = useState(() => Number(primeraSemanaEditable().slice(0, 4)));
  const [mes, setMes] = useState(() => Number(primeraSemanaEditable().slice(5, 7)));
  const [cambiosPendientes, setCambiosPendientes] = useState(false);
  // Modo supervisión: horas reales frente a planificadas de la misma semana (solo lectura)
  const [supervision, setSupervision] = useState(false);

  const semanasMes = useFrappeGetCall("prototipo.api.planificacion.semanas_del_mes", { anio, mes });
  const semanas = semanasMes.data?.message?.semanas ?? [];

  // La semana para el editor. No se pide sin semana elegida (null) ni en modo supervisión.
  // Sin recargar al volver a la pestaña: si otra persona guarda mientras editas, al guardar se te avisa.
  const { data, error, isLoading, mutate } = useFrappeGetCall(
    "prototipo.api.planificacion.obtener_semana",
    { lunes },
    lunes && !supervision ? undefined : null,
    { revalidateOnFocus: false, revalidateOnReconnect: false }
  );
  const info = data?.message;

  // Antes de salir de una semana (o de la edición) con cambios sin guardar
  const puedeSalir = () =>
    !cambiosPendientes || window.confirm("Hay cambios sin guardar en esta semana. ¿Descartarlos?");

  const elegirSemana = (nuevo) => {
    if (nuevo !== lunes && puedeSalir()) setLunes(nuevo);
  };

  // Al cambiar de mes: la semana actual si es de ese mes; si no, la primera del mes (cuando lleguen)
  const cambiarMes = (nuevoAnio, nuevoMes) => {
    if (!puedeSalir()) return;
    const actual = primeraSemanaEditable();
    const prefijo = `${nuevoAnio}-${String(nuevoMes).padStart(2, "0")}`;
    setAnio(nuevoAnio);
    setMes(nuevoMes);
    setLunes(actual.startsWith(prefijo) ? actual : null);
  };

  const irASemanaActual = () => {
    if (!puedeSalir()) return;
    const actual = primeraSemanaEditable();
    setAnio(Number(actual.slice(0, 4)));
    setMes(Number(actual.slice(5, 7)));
    setLunes(actual);
  };

  // Entrar en supervisión descarta lo no guardado (el editor desaparece); la semana se mantiene
  const entrarEnSupervision = () => {
    if (!puedeSalir()) return;
    setCambiosPendientes(false);
    setSupervision(true);
  };

  // Al volver, el editor se monta de nuevo con lo guardado de esa misma semana
  const volverAPlanificacion = () => setSupervision(false);

  useEffect(() => {
    if (!lunes && semanas.length) setLunes(semanas[0].lunes);
  }, [lunes, semanas]);

  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Planificación</h1>
            {cambiosPendientes && (
              <span
                role="status"
                className="rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-700 ring-1 ring-red-200"
              >
                Hay cambios sin guardar
              </span>
            )}
          </div>

          {supervision ? (
            <button
              type="button"
              onClick={volverAPlanificacion}
              aria-label="Volver a la planificación"
              title="Volver a la planificación"
              className="grid h-10 w-10 place-items-center rounded-lg border border-salvia-900/20 text-salvia-950/70 hover:border-salvia-900 hover:bg-salvia hover:text-salvia-950"
            >
              <IconoVolver />
            </button>
          ) : (
            <button
              type="button"
              onClick={entrarEnSupervision}
              className="rounded-lg bg-salvia-900 px-4 py-2 text-sm font-semibold text-salvia-200 hover:bg-salvia hover:text-salvia-950"
            >
              Supervisión
            </button>
          )}
        </div>

        {supervision && (
          <p className="text-sm font-medium text-salvia-950/70">
            Modo supervisión · horas reales / planificadas de la semana
          </p>
        )}
      </div>

      <SelectorSemana
        anio={anio}
        mes={mes}
        semanas={semanas}
        semanaActual={primeraSemanaEditable()}
        lunes={lunes}
        cargando={semanasMes.isLoading}
        onCambiarMes={cambiarMes}
        onCambiarSemana={elegirSemana}
        onIrASemanaActual={irASemanaActual}
      />

      {semanasMes.error && <p className="text-sm text-red-600">{mensajeDeError(semanasMes.error)}</p>}

      {supervision ? (
        <Supervision lunes={lunes} />
      ) : (
        <>
          {lunes && isLoading && <p className="text-sm text-salvia-950/50">Cargando semana…</p>}
          {lunes && error && <p className="text-sm text-red-600">{mensajeDeError(error)}</p>}

          {lunes && info && (
            <>
              <Avisos semana={info.semana} />
              {/* key: el editor empieza de cero al cambiar de semana y después de guardar */}
              <EditorSemana
                key={`${lunes}|${info.modificado ?? ""}`}
                info={info}
                lunes={lunes}
                onGuardado={(nueva) => mutate({ message: nueva }, { revalidate: false })}
                onCambiosPendientes={setCambiosPendientes}
              />
            </>
          )}
        </>
      )}
    </section>
  );
}