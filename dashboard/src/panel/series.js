// Los gráficos usan siempre los mismos tres colores, con el mismo significado en todo el panel.
// Dos pasos de la rampa salvia (comprobados: contraste y separación para daltonismo) y un gris.
export const SERIES = {
  ganado: { etiqueta: "Ganado", fondo: "bg-salvia-700" },
  oportunidad: { etiqueta: "En oportunidad", fondo: "bg-salvia" },
  rechazado: { etiqueta: "Rechazado", fondo: "bg-gray-400" },
};

// Serie de cada estado del proyecto
export const SERIE_DE_ESTADO = {
  Oportunidad: "oportunidad",
  Aceptado: "ganado",
  "En curso": "ganado",
  Cerrado: "ganado",
  Rechazado: "rechazado",
};

const fmtMes = new Intl.DateTimeFormat("es-ES", { month: "short" });

// "2026-10" → "oct"; con el año en la primera columna y en enero: "oct 26", "ene 27"
export function etiquetaMes(mes, conAnio) {
  const [anio, num] = mes.split("-").map(Number);
  const nombre = fmtMes.format(new Date(anio, num - 1, 1)).replace(".", "");
  return conAnio || num === 1 ? `${nombre} ${String(anio).slice(2)}` : nombre;
}

// Máximo "redondo" para el eje: 1, 2, 2,5 o 5 × potencia de 10
export function maximoRedondo(valor) {
  if (valor <= 0) return 1;
  const potencia = 10 ** Math.floor(Math.log10(valor));
  const paso = [1, 2, 2.5, 5, 10].find((p) => p * potencia >= valor);
  return paso * potencia;
}
