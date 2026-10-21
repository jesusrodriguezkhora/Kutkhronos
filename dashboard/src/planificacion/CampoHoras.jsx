import { useEffect, useState } from "react";
import { esMediaHora, formatearHoras } from "./calculo";

// Campo de horas de una celda. Guarda su propio texto mientras se escribe (para poder teclear "7,"
// antes del 5) y avisa con un número en cada cambio.
export default function CampoHoras({ valor, onChange, etiqueta }) {
  const [texto, setTexto] = useState(formatearHoras(valor));
  const [enfocado, setEnfocado] = useState(false);

  // Si el valor cambia desde fuera (copiar semana, descartar), se refleja cuando no se está escribiendo
  useEffect(() => {
    if (!enfocado) setTexto(formatearHoras(valor));
  }, [valor, enfocado]);

  const invalido = valor < 0 || !esMediaHora(valor);

  return (
    <input
      type="text"
      inputMode="decimal"
      aria-label={etiqueta}
      aria-invalid={invalido}
      title={invalido ? "Las horas van en medias horas (0,5 · 1 · 1,5…)" : undefined}
      className={`w-16 rounded-lg border px-2 py-1 text-right tabular-nums outline-none focus:border-salvia-900 focus:ring-2 focus:ring-salvia ${
        invalido ? "border-red-400 bg-red-50 text-red-700" : "border-salvia-900/15 bg-white"
      }`}
      value={texto}
      onFocus={(e) => {
        setEnfocado(true);
        e.target.select();
      }}
      onBlur={() => setEnfocado(false)}
      onChange={(e) => {
        const limpio = e.target.value.replace(/[^\d.,]/g, "");
        setTexto(limpio);
        const numero = Number(limpio.replace(",", "."));
        onChange(Number.isNaN(numero) ? 0 : numero);
      }}
    />
  );
}