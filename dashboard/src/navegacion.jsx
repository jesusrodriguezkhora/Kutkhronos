import Dashboard from "./dashboard/Dashboard";
import Proyectos from "./proyectos/Proyectos";
import Clientes from "./clientes/Clientes";
import Empleados from "./empleados/Empleados";
import Planificacion from "./planificacion/Planificacion";
import Imputacion from "./imputacion/Imputacion";
import PaginaPendiente from "./componentes/PaginaPendiente";
import {
  IconoDashboard,
  IconoFacturacion,
  IconoPlanificacion,
  IconoProyectos,
  IconoRecursos,
} from "./componentes/Iconos";

// Configuración central del menú lateral y de las rutas de la SPA.
//
// Cada entrada de primer nivel es una página (con `Componente`) o una categoría (con `hijos`).
// Páginas:
//   - modulo: permiso necesario; debe coincidir con los valores de prototipo.api.sesion.mi_perfil.modulos
//   - ruta: dirección de la página. `antiguas`: direcciones anteriores que redirigen a esta
//   - movil: se muestra también en móvil (menos de 768 px); el resto, solo en escritorio
// Categorías: su `ruta` es el prefijo de las de sus hijos y redirige al primero disponible.
//
// El orden es el del menú; la primera página disponible es la página de entrada.
export const NAVEGACION = [
  {
    clave: "dashboard",
    etiqueta: "Dashboard",
    icono: IconoDashboard,
    modulo: "dashboard",
    ruta: "/",
    antiguas: ["/panel"],
    Componente: Dashboard,
  },
  {
    clave: "proyectos",
    etiqueta: "Proyectos",
    icono: IconoProyectos,
    ruta: "/proyectos",
    hijos: [
      {
        clave: "pipeline",
        etiqueta: "Pipeline",
        modulo: "proyectos",
        ruta: "/proyectos/pipeline",
        antiguas: ["/pipeline"],
        Componente: Proyectos,
      },
      {
        clave: "estado",
        etiqueta: "Estado",
        modulo: "estado_proyectos",
        ruta: "/proyectos/estado",
        Componente: () => <PaginaPendiente titulo="Estado de proyectos" />,
      },
    ],
  },
  {
    clave: "recursos",
    etiqueta: "Recursos",
    icono: IconoRecursos,
    ruta: "/recursos",
    hijos: [
      {
        clave: "empleados",
        etiqueta: "Empleados",
        modulo: "empleados",
        ruta: "/recursos/empleados",
        antiguas: ["/empleados"],
        Componente: Empleados,
      },
      {
        clave: "clientes",
        etiqueta: "Clientes",
        modulo: "clientes",
        ruta: "/recursos/clientes",
        antiguas: ["/clientes"],
        Componente: Clientes,
      },
    ],
  },
  {
    clave: "facturacion",
    etiqueta: "Facturación",
    icono: IconoFacturacion,
    ruta: "/facturacion",
    hijos: [
      {
        clave: "historico",
        etiqueta: "Histórico",
        modulo: "historico",
        ruta: "/facturacion/historico",
        Componente: () => <PaginaPendiente titulo="Histórico de facturación" />,
      },
      {
        clave: "facturas",
        etiqueta: "Facturas",
        modulo: "facturas",
        ruta: "/facturacion/facturas",
        Componente: () => <PaginaPendiente titulo="Facturas" />,
      },
    ],
  },
  {
    clave: "planificacion",
    etiqueta: "Planificación",
    icono: IconoPlanificacion,
    ruta: "/planificacion",
    hijos: [
      {
        clave: "carga",
        etiqueta: "Carga de horas",
        modulo: "imputacion",
        ruta: "/planificacion/carga",
        antiguas: ["/carga"],
        Componente: Imputacion,
        movil: true,
      },
      {
        clave: "horas",
        etiqueta: "Planificación de horas",
        modulo: "planificacion",
        ruta: "/planificacion/horas",
        // La antigua página Planificación estaba en /planificacion (ahora, la ruta de la categoría)
        antiguas: ["/planificacion"],
        Componente: Planificacion,
      },
    ],
  },
];

// El menú que ve el usuario: solo las páginas de sus módulos (y en móvil, solo las de móvil).
// Las categorías sin ninguna página disponible desaparecen.
export function navegacionDisponible(modulos, esMovil) {
  const disponible = (p) => modulos.includes(p.modulo) && (!esMovil || p.movil);
  return NAVEGACION.flatMap((e) => {
    if (!e.hijos) return disponible(e) ? [e] : [];
    const hijos = e.hijos.filter(disponible);
    return hijos.length ? [{ ...e, hijos }] : [];
  });
}

// Todas las páginas de un menú, en orden, con la categoría a la que pertenecen
export function paginasDe(navegacion) {
  return navegacion.flatMap((e) => (e.hijos ? e.hijos.map((h) => ({ ...h, categoria: e })) : [e]));
}
