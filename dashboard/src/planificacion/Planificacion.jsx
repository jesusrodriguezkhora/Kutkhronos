import { useEffect, useState } from "react";
import { useFrappeGetCall } from "frappe-react-sdk";
import SelectorSemana from "./SelectorSemana";
import TablaPlanificacion from "./TablaPlanificacion";
import { indexarCeldas, lunesActual } from "./calculo";
import { formatearFecha } from "../lib/formato";
import { mensajeDeError } from "../lib/errores";

// "2026-10-21 10:37:00.123" -> "21/10/2026 a las 10:37"
function fechaYHora(valor) {
  const [fecha, hora] = valor.split(" ");
  return `${formatearFecha(fecha)} a las ${hora.slice(0, 5)}`;
}

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
      {!semana.editable && (
        <p className="rounded-lg border-l-4 border-salvia-900 bg-salvia-100 px-3 py-2 text-salvia-950">
          Semana pasada: solo lectura.
        </p>
      )}
    </div>
  );
}

export default function Planificacion() {
  // La pantalla abre en la semana actual, en el mes de su lunes
  const [lunes, setLunes] = useState(lunesActual);
  const [anio, setAnio] = useState(() => Number(lunesActual().slice(0, 4)));
  const [mes, setMes] = useState(() => Number(lunesActual().slice(5, 7)));

  const semanasMes = useFrappeGetCall("prototipo.api.planificacion.semanas_del_mes", { anio, mes });
  const semanas = semanasMes.data?.message?.semanas ?? [];

  // Mientras no haya semana elegida (null), no se pide nada
  const { data, error, isLoading } = useFrappeGetCall(
    "prototipo.api.planificacion.obtener_semana",
    { lunes },
    lunes ? undefined : null
  );
  const info = data?.message;

  // Al cambiar de mes: la semana actual si es de ese mes; si no, la primera del mes (cuando lleguen)
  const cambiarMes = (nuevoAnio, nuevoMes) => {
    const actual = lunesActual();
    const prefijo = `${nuevoAnio}-${String(nuevoMes).padStart(2, "0")}`;
    setAnio(nuevoAnio);
    setMes(nuevoMes);
    setLunes(actual.startsWith(prefijo) ? actual : null);
  };

  useEffect(() => {
    if (!lunes && semanas.length) setLunes(semanas[0].lunes);
  }, [lunes, semanas]);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Planificación</h1>
        {info && <p className="mt-1 text-sm text-salvia-950/60">{info.semana.etiqueta}</p>}
      </div>

      <SelectorSemana
        anio={anio}
        mes={mes}
        semanas={semanas}
        semanaActual={semanasMes.data?.message?.semana_actual}
        lunes={lunes}
        cargando={semanasMes.isLoading}
        onCambiarMes={cambiarMes}
        onCambiarSemana={setLunes}
      />

      {semanasMes.error && <p className="text-sm text-red-600">{mensajeDeError(semanasMes.error)}</p>}
      {lunes && isLoading && <p className="text-sm text-salvia-950/50">Cargando semana…</p>}
      {lunes && error && <p className="text-sm text-red-600">{mensajeDeError(error)}</p>}

      {lunes && info && (
        <>
          <Avisos semana={info.semana} />
          <TablaPlanificacion
            filas={info.filas}
            conceptos={info.conceptos_administracion}
            empleados={info.empleados}
            indice={indexarCeldas(info.celdas)}
          />
          <p className="text-xs text-salvia-950/50">
            {info.modificado
              ? `Última edición el ${fechaYHora(info.modificado)} por ${info.modificado_por}.`
              : "Esta semana todavía no se ha planificado."}
          </p>
        </>
      )}
    </section>
  );
}