// Cálculos y utilidades de la tabla de planificación (sin React)

export const CONCEPTO_PROYECTO = "Proyecto";

export const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const formatoHoras = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 });

// 7.5 -> "7,5"; 0 o vacío -> ""
export function formatearHoras(valor) {
  return valor ? formatoHoras.format(valor) : "";
}

// "AAAA-MM-DD" de una fecha local (sin pasar por UTC, que podría cambiar el día)
export function aISO(fecha) {
  const mm = String(fecha.getMonth() + 1).padStart(2, "0");
  const dd = String(fecha.getDate()).padStart(2, "0");
  return `${fecha.getFullYear()}-${mm}-${dd}`;
}

// Lunes de la semana de hoy, como "AAAA-MM-DD"
export function lunesActual() {
  const hoy = new Date();
  const lunes = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - ((hoy.getDay() + 6) % 7));
  return aISO(lunes);
}

// Clave de una fila de la tabla: el código del proyecto, o "Vacaciones" / "Formación"
export function claveFila(celda) {
  return celda.concepto === CONCEPTO_PROYECTO ? celda.proyecto : celda.concepto;
}

// {fila: {empleado: horas}} a partir de la lista de celdas de la API
export function indexarCeldas(celdas) {
  const indice = {};
  for (const c of celdas) {
    const fila = claveFila(c);
    indice[fila] = { ...indice[fila], [c.empleado]: Number(c.horas) || 0 };
  }
  return indice;
}

// Totales por fila, por persona y general
export function calcularTotales(indice, filas, empleados) {
  const porFila = {};
  const porEmpleado = Object.fromEntries(empleados.map((e) => [e.usuario, 0]));
  let general = 0;
  for (const fila of filas) {
    let total = 0;
    for (const e of empleados) {
      const horas = indice[fila]?.[e.usuario] || 0;
      total += horas;
      porEmpleado[e.usuario] += horas;
    }
    porFila[fila] = total;
    general += total;
  }
  return { porFila, porEmpleado, general };
}

// Por encima del máximo (con margen para los decimales)
export function superaMaximo(total, maximo) {
  return maximo != null && total > maximo + 1e-9;
}