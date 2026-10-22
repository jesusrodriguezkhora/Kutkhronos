import { useEffect, useState } from "react";
import { useFrappeGetCall } from "frappe-react-sdk";
import SelectorSemana from "./SelectorSemana";
import EditorSemana from "./EditorSemana";
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

export default function Planificacion() {
  // La pantalla abre en la semana actual, en el mes de su lunes
  const [lunes, setLunes] = useState(primeraSemanaEditable);
  const [anio, setAnio] = useState(() => Number(primeraSemanaEditable().slice(0, 4)));
  const [mes, setMes] = useState(() => Number(primeraSemanaEditable().slice(5, 7)));
  const [cambiosPendientes, setCambiosPendientes] = useState(false);

  const semanasMes = useFrappeGetCall("prototipo.api.planificacion.semanas_del_mes", { anio, mes });
  const semanas = semanasMes.data?.message?.semanas ?? [];

  // Mientras no haya semana elegida (null), no se pide nada. Sin recargar al volver a la pestaña:
  // si otra persona guarda mientras editas, al guardar se te avisa en vez de perder lo que llevas.
  const { data, error, isLoading, mutate } = useFrappeGetCall(
    "prototipo.api.planificacion.obtener_semana",
    { lunes },
    lunes ? undefined : null,
    { revalidateOnFocus: false, revalidateOnReconnect: false }
  );
  const info = data?.message;

  // Antes de salir de una semana con cambios sin guardar
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

  useEffect(() => {
    if (!lunes && semanas.length) setLunes(semanas[0].lunes);
  }, [lunes, semanas]);

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Planificación</h1>

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
    </section>
  );
}