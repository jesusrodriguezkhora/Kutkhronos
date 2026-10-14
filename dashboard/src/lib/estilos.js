const CAMPO_BASE =
  "w-full rounded-lg px-3 py-2 text-sm text-salvia-950 outline-none focus:ring-2 focus:ring-salvia disabled:cursor-not-allowed disabled:bg-salvia-900/5 disabled:text-salvia-950/50";

export const ESTILOS = {
  oscuro: {
    campo: `${CAMPO_BASE} border border-white/10 bg-white`,
    etiqueta: "mb-1 block text-xs font-semibold uppercase tracking-wider text-salvia-200",
  },
  claro: {
    campo: `${CAMPO_BASE} border border-salvia-900/15 bg-white focus:border-salvia-900`,
    etiqueta: "mb-1 block text-xs font-semibold uppercase tracking-wider text-salvia-950/60",
  },
};