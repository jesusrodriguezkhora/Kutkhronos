// Bocadillo de comentario de una celda: vacío si no hay comentario, relleno si lo hay.
// Icono "chat-bubble-left" de Heroicons (licencia MIT).
const BOCADILLO =
  "M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z";

export default function BotonComentario({ tieneComentario, onClick, etiqueta }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={etiqueta}
      title={tieneComentario ? "Ver comentario" : "Añadir comentario"}
      className={`grid h-6 w-6 shrink-0 place-items-center rounded-md hover:bg-salvia ${
        tieneComentario ? "text-salvia-900" : "text-salvia-950/30 hover:text-salvia-950"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill={tieneComentario ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={1.5}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d={BOCADILLO} />
      </svg>
    </button>
  );
}

// Hueco del mismo tamaño, para que las celdas sin bocadillo queden alineadas
export function HuecoComentario() {
  return <span aria-hidden="true" className="h-6 w-6 shrink-0" />;
}