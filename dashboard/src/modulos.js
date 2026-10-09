import Proyectos from "./proyectos/Proyectos";
import Empleados from "./empleados/Empleados";

// Módulos de la SPA. El orden es el del menú.
// "clave" debe coincidir con los valores que devuelve prototipo.api.sesion.mi_perfil
export const MODULOS = [
  { clave: "proyectos", ruta: "/proyectos", etiqueta: "Proyectos", Componente: Proyectos },
  { clave: "empleados", ruta: "/empleados", etiqueta: "Empleados", Componente: Empleados },
];