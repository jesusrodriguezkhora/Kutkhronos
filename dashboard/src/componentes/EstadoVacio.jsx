import { IconoDocumento } from "./Iconos";

// Bloque para secciones sin contenido todavía (páginas o dashboards pendientes de definir)
export default function EstadoVacio({ titulo = "Todavía no hay nada aquí", texto, icono: Icono = IconoDocumento }) {
  return (
    <div className="rounded-xl border border-dashed border-salvia-900/20 bg-white/60 px-6 py-16 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-salvia-100 text-salvia-700">
        <Icono className="h-6 w-6" />
      </span>
      <h2 className="mt-4 text-base font-semibold">{titulo}</h2>
      {texto && <p className="mx-auto mt-1 max-w-md text-sm text-salvia-950/60">{texto}</p>}
    </div>
  );
}
