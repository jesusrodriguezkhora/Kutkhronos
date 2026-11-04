import { useEffect, useState } from "react";

// Móvil = pantalla más estrecha que el punto de corte md de Tailwind (768 px).
// Tablets y ordenadores usan la versión de escritorio.
const CONSULTA = "(max-width: 767px)";

// true en móvil. Se actualiza solo al girar el móvil o cambiar el tamaño de la ventana.
export function useEsMovil() {
  const [esMovil, setEsMovil] = useState(() => window.matchMedia(CONSULTA).matches);

  useEffect(() => {
    const consulta = window.matchMedia(CONSULTA);
    const alCambiar = (e) => setEsMovil(e.matches);
    consulta.addEventListener("change", alCambiar);
    setEsMovil(consulta.matches);
    return () => consulta.removeEventListener("change", alCambiar);
  }, []);

  return esMovil;
}