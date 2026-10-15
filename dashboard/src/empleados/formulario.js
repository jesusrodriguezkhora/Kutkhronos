import { ESTILOS } from "../lib/estilos";

// Constantes y utilidades compartidas por los formularios de alta y edición de empleados

export const clases = ESTILOS.claro;

// Valores que acepta prototipo.api.empleados (ROLES_ASIGNABLES)
export const ROLES = ["Empleado", "Coordinador"];

// Sin caracteres que se confunden al leerlos o dictarlos (I, l, 1, O, 0)
const CARACTERES = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*?";

export function generarContrasena(longitud = 14) {
  const aleatorios = crypto.getRandomValues(new Uint32Array(longitud));
  return Array.from(aleatorios, (n) => CARACTERES[n % CARACTERES.length]).join("");
}
