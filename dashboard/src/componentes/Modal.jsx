import { useEffect } from "react";

// Ventana superpuesta genérica: fondo oscuro, cabecera con título y ×, cierre con Escape o clic fuera.
// El contenido (cuerpo y botones) lo pone quien la usa.
export default function Modal({ titulo, subtitulo, onCerrar, children, ancho = "max-w-2xl" }) {
  // Se vuelve a suscribir en cada render para usar siempre la versión actual de onCerrar
  useEffect(() => {
    const alPulsar = (e) => e.key === "Escape" && onCerrar();
    document.addEventListener("keydown", alPulsar);
    return () => document.removeEventListener("keydown", alPulsar);
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}
    >
      <div
        className={`flex max-h-[90vh] w-full ${ancho} flex-col overflow-hidden rounded-2xl bg-white shadow-2xl`}
      >
        <div className="flex items-center justify-between bg-black px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-[#fadc6a]">{titulo}</h2>
            {subtitulo && <p className="text-xs text-white/60">{subtitulo}</p>}
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="grid h-8 w-8 place-items-center rounded-lg text-white/60 hover:bg-[#fadc6a] hover:text-black"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}