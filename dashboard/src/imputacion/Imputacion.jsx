import { useEffect, useState } from "react";
import { useFrappeGetCall } from "frappe-react-sdk";
import SelectorSemana from "../planificacion/SelectorSemana";
import TablaImputacion from "./TablaImputacion";
import { filasDe, indexarCeldas, lunesActual, ultimoDiaParaImputar, vacacionesPorDia, CONCEPTO_VACACIONES } from "./calculo";
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

// Pie bajo la tabla, como en planificación: estado de la semana (y en el paso 4b, los botones)
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

export default function Imputacion() {
  // Abre en la semana actual, en el mes de su lunes
  const [lunes, setLunes] = useState(lunesActual);
  const [anio, setAnio] = useState(() => Number(lunesActual().slice(0, 4)));
  const [mes, setMes] = useState(() => Number(lunesActual().slice(5, 7)));
  const [cambiosPendientes] = useState(false); // en el paso 4b lo actualizará el editor

  const semanasMes = useFrappeGetCall("prototipo.api.imputacion.semanas_del_mes", { anio, mes });
  const semanas = semanasMes.data?.message?.semanas ?? [];

  const { data, error, isLoading } = useFrappeGetCall(
    "prototipo.api.imputacion.obtener_semana",
    { lunes },
    lunes ? undefined : null,
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

  useEffect(() => {
    if (!lunes && semanas.length) setLunes(semanas[0].lunes);
  }, [lunes, semanas]);

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Imputación de horas</h1>

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
      {lunes && isLoading && <p className="text-sm text-salvia-950/50">Cargando semana…</p>}
      {lunes && error && <p className="text-sm text-red-600">{mensajeDeError(error)}</p>}

      {lunes && info && (
        <>
          <Avisos semana={info.semana} />
          {/* Paso 4a: solo lectura. En el 4b esto será <EditorImputacion ...> */}
          <div className="space-y-4">
            <TablaImputacion
              filas={filasDe(info)}
              dias={info.semana.dias}
              indice={{ ...indexarCeldas(info.celdas), [CONCEPTO_VACACIONES]: vacacionesPorDia(info.semana.dias) }}
              teletrabajo={info.teletrabajo}
            />
            <PieSemana semana={info.semana} />
          </div>
        </>
      )}
    </section>
  );
}