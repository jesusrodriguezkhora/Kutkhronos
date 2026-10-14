const CAMPO_BASE =
  "w-full rounded-lg px-3 py-2 text-sm text-black outline-none focus:ring-2 focus:ring-amarillo disabled:cursor-not-allowed disabled:bg-black/5 disabled:text-black/50";

export const ESTILOS = {
  oscuro: {
    campo: `${CAMPO_BASE} border border-white/10 bg-white`,
    etiqueta: "mb-1 block text-xs font-semibold uppercase tracking-wider text-amarillo",
  },
  claro: {
    campo: `${CAMPO_BASE} border border-black/15 bg-white focus:border-black`,
    etiqueta: "mb-1 block text-xs font-semibold uppercase tracking-wider text-black/60",
  },
};