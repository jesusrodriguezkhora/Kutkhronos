import Proyectos from "./proyectos/Proyectos";
import Clientes from "./clientes/Clientes";
import Empleados from "./empleados/Empleados";

// Módulos de la SPA. El orden es el del menú.
// "clave" debe coincidir con los valores que devuelve prototipo.api.sesion.mi_perfil
export const MODULOS = [
  { clave: "proyectos", ruta: "/pipeline", etiqueta: "Pipeline", Componente: Proyectos },
  { clave: "clientes", ruta: "/clientes", etiqueta: "Clientes", Componente: Clientes },
  { clave: "empleados", ruta: "/empleados", etiqueta: "Empleados", Componente: Empleados },
];