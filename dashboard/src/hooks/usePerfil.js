import { useFrappeGetCall } from "frappe-react-sdk";

// Perfil del usuario de la sesión (prototipo.api.sesion.mi_perfil): nombre, módulos, dashboard…
// Inicio.jsx lo pide al entrar; el resto de componentes reutilizan la respuesta que ya hay en memoria.
export function usePerfil() {
  return useFrappeGetCall("prototipo.api.sesion.mi_perfil").data?.message;
}
