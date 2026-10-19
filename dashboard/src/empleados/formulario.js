import { ESTILOS } from "../lib/estilos";

// Constantes y utilidades compartidas por los formularios de alta y edición de empleados

export const clases = ESTILOS.claro;

// Sin caracteres que se confunden al leerlos o dictarlos (I, l, 1, O, 0)
const CARACTERES = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*?";

export function generarContrasena(longitud = 14) {
  const aleatorios = crypto.getRandomValues(new Uint32Array(longitud));
  return Array.from(aleatorios, (n) => CARACTERES[n % CARACTERES.length]).join("");
}

// Opciones del campo Posición (DocType Datos Laborales)
export const POSICIONES = ["Prácticas", "Consultor", "Consultor Senior", "Coordinador", "Director"];

// Igual que calcular_coste_hora en datos_laborales.py, para mostrarlo mientras se escribe
export const SEMANAS_ANIO = 52;

export function calcularCosteHora(salarioAnual, horasSemanales) {
  const horasAnio = Number(horasSemanales) * SEMANAS_ANIO;
  if (!(Number(salarioAnual) > 0) || !(horasAnio > 0)) return null;
  return Number(salarioAnual) / horasAnio;
}

// Valores de los datos laborales para el formulario ("" en vez de null en los campos vacíos)
export function laboralesIniciales(empleado) {
  return {
    posicion: empleado?.posicion ?? "",
    salario_anual: empleado?.salario_anual ? String(empleado.salario_anual) : "",
    horas_semanales: empleado?.horas_semanales ? String(empleado.horas_semanales) : "",
  };
}
