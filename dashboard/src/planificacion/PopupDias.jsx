import { useState } from "react";
import Modal from "../componentes/Modal";
import CampoHoras from "./CampoHoras";
import { esMediaHora, formatearHoras, sumarDias } from "./calculo";

// "2026-11-10" -> "10/11"
const diaYMes = (fecha) => `${fecha.slice(8, 10)}/${fecha.slice(5, 7)}`;
const conMayuscula = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1);

// Solo los días con horas, en orden: para comparar y para devolver el resultado
const sinVacios = (valores) =>
  Object.fromEntries(Object.entries(valores).filter(([, horas]) => horas).sort());

// Las vacaciones son de día completo: se marcan con una casilla y valen la jornada diaria
const CONCEPTO_VACACIONES = "Vacaciones";

// Detalle por día (lunes a viernes) de las vacaciones o la formación de una persona.
// Los festivos y los días que ya tienen el otro concepto no se pueden rellenar.
export default function PopupDias({
  concepto,
  otroConcepto,
  empleado,
  dias,
  valores,
  otros,
  editable,
  onAplicar,
  onCerrar,
}) {
  const [borrador, setBorrador] = useState(() => ({ ...valores }));
  const jornada = empleado.jornada_diaria;
  const porDias = concepto === CONCEPTO_VACACIONES;

  const excedeJornada = (horas) => jornada != null && horas > jornada + 1e-9;
  const invalido = dias.some((d) => {
    const horas = borrador[d.fecha] || 0;
    if (porDias) return false;
    return horas < 0 || !esMediaHora(horas) || excedeJornada(horas);
  });
  const hayCambios = JSON.stringify(sinVacios(borrador)) !== JSON.stringify(sinVacios(valores));

  return (
    <Modal titulo={concepto} subtitulo={empleado.nombre} onCerrar={onCerrar} ancho="max-w-md">
      <ul className="divide-y divide-salvia-900/10 px-6 py-2">
        {dias.map((d) => {
          const horas = borrador[d.fecha] || 0;
          const otro = otros[d.fecha] || 0;

          let contenido;
          if (d.festivo) {
            contenido = <span className="text-right text-xs text-salvia-950/50">Festivo · {d.festivo}</span>;
          } else if (otro) {
            contenido = (
              <span className="text-xs text-salvia-950/50">
                {otroConcepto} ese día ({formatearHoras(otro)} h)
              </span>
            );
          } else if (porDias) {
            // Vacaciones: día completo o nada
            contenido = (
              <label className="flex items-center gap-2 text-sm">
                <span className={`tabular-nums ${horas ? "text-salvia-950" : "text-salvia-950/40"}`}>
                  {formatearHoras(horas || jornada) || 0} h
                </span>
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-salvia-900 disabled:cursor-not-allowed"
                  checked={horas > 0}
                  disabled={!editable || jornada == null}
                  onChange={(e) => setBorrador((b) => ({ ...b, [d.fecha]: e.target.checked ? jornada : 0 }))}
                  aria-label={`Vacaciones el ${d.nombre}`}
                />
              </label>
            );  
          } else if (editable) {
            contenido = (
              <div className="flex items-center gap-2">
                {excedeJornada(horas) && <span className="text-xs text-red-700">Más que la jornada</span>}
                <CampoHoras
                  valor={horas}
                  onChange={(v) => setBorrador((b) => ({ ...b, [d.fecha]: v }))}
                  etiqueta={`${concepto} el ${d.nombre}`}
                />
                <span className="text-sm text-salvia-950/50">h</span>
              </div>
            );
          } else {
            contenido = (
              <span className="text-sm tabular-nums">{horas ? `${formatearHoras(horas)} h` : "—"}</span>
            );
          }

          return (
            <li key={d.fecha} className="flex min-h-[3.25rem] items-center justify-between gap-4 py-2">
              <span className="text-sm font-medium">
                {conMayuscula(d.nombre)} <span className="font-normal text-salvia-950/50">{diaYMes(d.fecha)}</span>
              </span>
              {contenido}
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between gap-3 border-t border-salvia-900/10 px-6 py-4">
        <p className="text-xs text-salvia-950/60">
          Total: <span className="font-semibold text-salvia-950">{formatearHoras(sumarDias(borrador)) || 0} h</span>
          {porDias && ` (${Object.values(borrador).filter(Boolean).length} días)`}
          {jornada != null && ` · Jornada diaria: ${formatearHoras(jornada)} h`}
        </p>

        {editable ? (
          <div className="flex shrink-0 gap-3">
            <button
              type="button"
              onClick={onCerrar}
              className="rounded-lg px-4 py-2 text-sm font-medium text-salvia-950/60 hover:bg-salvia-900/5 hover:text-salvia-950"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => onAplicar(sinVacios(borrador))}
              disabled={invalido || !hayCambios}
              className="rounded-lg bg-salvia-900 px-5 py-2 text-sm font-semibold text-salvia-200 hover:bg-salvia hover:text-salvia-950 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Aplicar
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-lg bg-salvia-900 px-5 py-2 text-sm font-semibold text-salvia-200 hover:bg-salvia hover:text-salvia-950"
          >
            Cerrar
          </button>
        )}
      </div>
    </Modal>
  );
}