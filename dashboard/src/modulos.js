import Panel from "./panel/Panel";
import Proyectos from "./proyectos/Proyectos";
import Clientes from "./clientes/Clientes";
import Empleados from "./empleados/Empleados";

// Módulos de la SPA. El orden es el del menú; el primero disponible es la página de entrada.
// "clave" debe coincidir con los valores que devuelve prototipo.api.sesion.mi_perfil
export const MODULOS = [
  { clave: "panel", ruta: "/panel", etiqueta: "Panel", Componente: Panel },
  { clave: "proyectos", ruta: "/proyectos", etiqueta: "Proyectos", Componente: Proyectos },
  { clave: "clientes", ruta: "/clientes", etiqueta: "Clientes", Componente: Clientes },
  { clave: "empleados", ruta: "/empleados", etiqueta: "Empleados", Componente: Empleados },
];