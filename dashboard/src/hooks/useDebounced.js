import { useEffect, useState } from "react";

// Devuelve el valor recibido, pero solo después de que deje de cambiar durante `ms` milisegundos
export function useDebounced(valor, ms = 400) {
  const [retrasado, setRetrasado] = useState(valor);

  useEffect(() => {
    const temporizador = setTimeout(() => setRetrasado(valor), ms);
    return () => clearTimeout(temporizador);
  }, [valor, ms]);

  return retrasado;
}