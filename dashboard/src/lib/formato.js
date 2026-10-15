const euros = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
  useGrouping: "always",
});

export function formatearImporte(valor) {
  if (valor === null || valor === undefined) return "—";
  return euros.format(valor);
}

// Frappe envía las fechas como "AAAA-MM-DD"; las mostramos como "DD/MM/AAAA"
export function formatearFecha(valor) {
  if (!valor) return "—";
  const [anio, mes, dia] = valor.split("-");
  return `${dia}/${mes}/${anio}`;
}

const eurosConDecimales = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: "always",
});

export function formatearCosteHora(valor) {
  if (valor === null || valor === undefined) return "—";
  return `${eurosConDecimales.format(valor)}/h`;
}
