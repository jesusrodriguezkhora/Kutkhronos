import { useEffect, useState } from "react";
import { useFrappeGetCall } from "frappe-react-sdk";
import SelectorSemana from "../planificacion/SelectorSemana";
import Supervision from "../planificacion/Supervision";
import EditorImputacion from "./EditorImputacion";
import { lunesActual } from "./calculo";
import { formatearFecha } from "../lib/formato";
import { mensajeDeError } from "../lib/errores";

function Avisos({ semana }) {
  if (semana.festivos.length === 0) return null;
  return (
    <p className="text-sm text-salvia-950/70">
      ★ {semana.festivos.map((f) => `${formatearFecha(f.fecha)} · ${f.descripcion}`).join(" — ")}.
    </p>
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

export default function Imputacion() {
  // Quién es: si carga horas (empleados y coordinadores) y si supervisa (roles de gestión).
  // Es la misma llamada que hace Inicio.jsx, así que se reutiliza la respuesta que ya hay en memoria.
  const perfil = useFrappeGetCall("prototipo.api.sesion.mi_perfil").data?.message;
  const imputa = !!perfil?.imputa_horas;
  const supervisa = !!perfil?.supervisa;

  // Abre en la semana actual, en el mes de su lunes
  const [lunes, setLunes] = useState(lunesActual);
  const [anio, setAnio] = useState(() => Number(lunesActual().slice(0, 4)));
  const [mes, setMes] = useState(() => Number(lunesActual().slice(5, 7)));
  const [cambiosPendientes, setCambiosPendientes] = useState(false);
  const [guardados, setGuardados] = useState(0);
  // Modo supervisión: horas cargadas frente a planificadas de la misma semana (solo lectura)
  const [supervision, setSupervision] = useState(false);

  const semanasMes = useFrappeGetCall("prototipo.api.imputacion.semanas_del_mes", { anio, mes });
  const semanas = semanasMes.data?.message?.semanas ?? [];

  // La carga de la semana, solo para quien carga horas y fuera del modo supervisión
  const { data, error, isLoading, mutate } = useFrappeGetCall(
    "prototipo.api.imputacion.obtener_semana",
    { lunes },
    lunes && imputa && !supervision ? undefined : null,
    { revalidateOnFocus: false, revalidateOnReconnect: false }
  );
  const info = data?.message;

  const puedeSalir = () =>
    !cambiosPendientes || window.confirm("Hay cambios sin guardar en esta semana. ¿Descartarlos?");

  const elegirSemana = (nuevo) => {
    if (nuevo !== lunes && puedeSalir()) setLunes(nuevo);
  };

  const cambiarMes = (nuevoAnio, nuevoMes) => {
    if (!puedeSalir()) return;
    const actual = lunesActual();
    const prefijo = `${nuevoAnio}-${String(nuevoMes).padStart(2, "0")}`;
    setAnio(nuevoAnio);
    setMes(nuevoMes);
    setLunes(actual.startsWith(prefijo) ? actual : null);
  };

  const irASemanaActual = () => {
    if (!puedeSalir()) return;
    const actual = lunesActual();
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
  const volverACarga = () => setSupervision(false);

  useEffect(() => {
    if (!lunes && semanas.length) setLunes(semanas[0].lunes);
  }, [lunes, semanas]);

  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Carga de horas</h1>
            {cambiosPendientes && (
              <span
                role="status"
                className="rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-700 ring-1 ring-red-200"
              >
                Hay cambios sin guardar
              </span>
            )}
          </div>

          {supervisa &&
            (supervision ? (
              <button
                type="button"
                onClick={volverACarga}
                aria-label="Volver a la carga de horas"
                title="Volver a la carga de horas"
                className="inline-flex items-center rounded-lg bg-salvia-900 px-3 py-2 text-salvia-200 hover:bg-salvia hover:text-salvia-950"
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
            ))}
        </div>

        {supervision && (
          <p className="text-sm font-medium text-salvia-950/70">
            Modo supervisión · horas cargadas / planificadas de la semana
          </p>
        )}
      </div>

      <SelectorSemana
        anio={anio}
        mes={mes}
        semanas={semanas}
        semanaActual={lunesActual()}
        lunes={lunes}
        cargando={semanasMes.isLoading}
        onCambiarMes={cambiarMes}
        onCambiarSemana={elegirSemana}
        onIrASemanaActual={irASemanaActual}
        textoVolver="Volver a la semana actual"
        marcaActual="actual"
      />

      {semanasMes.error && <p className="text-sm text-red-600">{mensajeDeError(semanasMes.error)}</p>}

      {supervision ? (
        <Supervision lunes={lunes} />
      ) : !imputa ? (
        // CEO y Administración: no tienen tabla de carga propia
        perfil && (
          <p className="rounded-xl border border-salvia-900/10 bg-white px-4 py-6 text-sm text-salvia-950/60">
            Tu perfil no carga horas. Pulsa <span className="font-semibold text-salvia-950">Supervisión</span> para
            ver las horas cargadas frente a las planificadas de cada semana.
          </p>
        )
      ) : (
        <>
          {lunes && isLoading && <p className="text-sm text-salvia-950/50">Cargando semana…</p>}
          {lunes && error && <p className="text-sm text-red-600">{mensajeDeError(error)}</p>}

          {lunes && info && (
            <>
              <Avisos semana={info.semana} />
              {/* key: el editor empieza de cero al cambiar de semana y después de guardar */}
              <EditorImputacion
                key={`${lunes}|${guardados}`}
                info={info}
                lunes={lunes}
                onGuardado={(nueva) => {
                  mutate({ message: nueva }, { revalidate: false });
                  setGuardados((n) => n + 1);
                }}
                onCambiosPendientes={setCambiosPendientes}
              />
            </>
          )}
        </>
      )}
    </section>
  );
}