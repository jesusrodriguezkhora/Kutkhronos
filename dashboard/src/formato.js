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