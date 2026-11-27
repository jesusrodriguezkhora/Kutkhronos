// Tarjeta de un indicador (KPI): etiqueta, valor destacado y una línea de detalle opcional.
// `icono`: componente de icono (ver componentes/Iconos.jsx). `cargando`: muestra un hueco en el valor.
export default function TarjetaKPI({ etiqueta, valor, detalle, icono: Icono, cargando = false }) {
  return (
    <div className="rounded-xl border border-salvia-900/10 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-salvia-950/60">{etiqueta}</p>
        {Icono && (
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-salvia-100 text-salvia-700">
            <Icono className="h-5 w-5" />
          </span>
        )}
      </div>
      {cargando ? (
        <div className="mt-2 h-9 w-20 animate-pulse rounded-md bg-salvia-900/10" />
      ) : (
        <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums">{valor}</p>
      )}
      {detalle && <p className="mt-1 text-xs text-salvia-950/50">{detalle}</p>}
    </div>
  );
}

// Rejilla de tarjetas de KPI: se adapta al ancho (1 columna en móvil, hasta 4 en pantallas grandes)
export function RejillaKPI({ children }) {
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{children}</div>;
}
