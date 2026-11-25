import { useEffect, useRef, useState } from "react";

// Campo de fecha que siempre se ve y se escribe en dd/mm/aaaa (el <input type="date"> nativo usa el
// formato del idioma del navegador). Hacia fuera, igual que el nativo: valor y onChange en "AAAA-MM-DD"
// ("" si está vacío). El botón abre el calendario del navegador.

const aTexto = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "");

// "1/2/2026" o "01/02/2026" -> "2026-02-01"; null si no es una fecha válida
function aIso(texto) {
  const partes = texto.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!partes) return null;
  const [dia, mes, anio] = partes.slice(1).map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  if (fecha.getFullYear() !== anio || fecha.getMonth() !== mes - 1 || fecha.getDate() !== dia) return null;
  return `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

export default function CampoFecha({ valor, onChange, min, max, className = "", etiqueta }) {
  const [texto, setTexto] = useState(aTexto(valor));
  const calendario = useRef(null);

  // Si la fecha cambia desde fuera (p. ej. calculada a partir de la duración), se muestra la nueva
  useEffect(() => setTexto(aTexto(valor)), [valor]);

  const iso = aIso(texto);
  const fueraDeRango = iso && ((min && iso < min) || (max && iso > max));
  const invalida = texto.trim() !== "" && (!iso || fueraDeRango);

  const escribir = (nuevo) => {
    setTexto(nuevo);
    if (nuevo.trim() === "") return onChange("");
    const fecha = aIso(nuevo);
    if (fecha && !((min && fecha < min) || (max && fecha > max))) onChange(fecha);
  };

  return (
    <div className="relative">
      <input
        type="text"
        inputMode="numeric"
        placeholder="dd/mm/aaaa"
        aria-label={etiqueta}
        aria-invalid={invalida || undefined}
        className={`${className} pr-10 ${invalida ? "border-red-400 bg-red-50" : ""}`}
        value={texto}
        onChange={(e) => escribir(e.target.value)}
        onBlur={() => setTexto(aTexto(valor))}
      />
      <button
        type="button"
        onClick={() => calendario.current?.showPicker?.()}
        aria-label="Abrir calendario"
        className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-salvia-950/50 hover:bg-salvia-900/5 hover:text-salvia-950"
      >
        {/* Icono "calendar" de Heroicons (MIT) */}
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
        </svg>
      </button>
      {/* Selector nativo invisible: solo se usa para abrir el calendario del navegador */}
      <input
        ref={calendario}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 h-0 w-0 opacity-0"
        value={valor || ""}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}