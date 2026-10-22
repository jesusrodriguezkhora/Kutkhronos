import { MESES } from "./calculo";

function BotonMes({ onClick, etiqueta, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={etiqueta}
      title={etiqueta}
      className="grid h-9 w-9 place-items-center rounded-full text-lg font-semibold text-salvia-950 transition-colors hover:bg-salvia-900 hover:text-salvia-200"
    >
      {children}
    </button>
  );
}

// Mes (con flechas) y, debajo, las semanas de ese mes. Una semana pertenece al mes de su lunes.
export default function SelectorSemana({
  anio,
  mes,
  semanas,
  semanaActual,
  lunes,
  cargando,
  onCambiarMes,
  onCambiarSemana,
  onIrASemanaActual,
}) {
  const moverMes = (delta) => {
    const fecha = new Date(anio, mes - 1 + delta, 1);
    onCambiarMes(fecha.getFullYear(), fecha.getMonth() + 1);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-1 rounded-full bg-salvia p-1 shadow-sm">
          <BotonMes onClick={() => moverMes(-1)} etiqueta="Mes anterior">‹</BotonMes>
          <span className="w-36 text-center text-sm font-bold capitalize text-salvia-950">
            {MESES[mes - 1]} {anio}
          </span>
          <BotonMes onClick={() => moverMes(1)} etiqueta="Mes siguiente">›</BotonMes>
        </div>

        {/* Solo cuando se está viendo otra semana */}
        {lunes !== semanaActual && semanaActual && (
          <button
            type="button"
            onClick={onIrASemanaActual}
            className="rounded-full border border-salvia-900/30 px-4 py-2 text-sm font-medium text-salvia-950/70 hover:border-salvia-900 hover:bg-salvia hover:text-salvia-950"
          >
            ↺ Volver a la semana a planificar
          </button>
        )}
      </div>

      {cargando && <p className="text-sm text-salvia-950/50">Cargando semanas…</p>}

      <div role="tablist" aria-label="Semanas del mes" className="flex flex-wrap gap-2">
        {semanas.map((s) => {
          const activa = s.lunes === lunes;
          return (
            <button
              key={s.lunes}
              type="button"
              role="tab"
              aria-selected={activa}
              onClick={() => onCambiarSemana(s.lunes)}
              title={s.etiqueta}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                activa
                  ? "border-salvia-900 bg-salvia-900 text-salvia-200"
                  : `border-salvia-900/15 bg-white hover:bg-salvia ${s.editable ? "text-salvia-950" : "text-salvia-950/50"}`
              }`}
            >
              {s.etiqueta.replace("Semana del ", "")}
              {s.lunes === semanaActual && <span className="ml-1.5 text-xs font-semibold">· A planificar</span>}
              {s.festivos.length > 0 && (
                <span className="ml-1.5" title="Tiene festivos">
                  ★
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}