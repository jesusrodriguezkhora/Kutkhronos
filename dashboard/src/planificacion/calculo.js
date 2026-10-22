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

// Celdas de la API -> proyectos por semana y vacaciones/formación por día:
//   indice: {proyecto: {empleado: horas}}
//   diario: {concepto: {empleado: {fecha: horas}}}
export function indexarCeldas(celdas) {
  const indice = {};
  const diario = {};
  for (const c of celdas) {
    const horas = Number(c.horas) || 0;
    if (c.concepto === CONCEPTO_PROYECTO) {
      indice[c.proyecto] = { ...indice[c.proyecto], [c.empleado]: horas };
    } else {
      diario[c.concepto] = { ...diario[c.concepto] };
      diario[c.concepto][c.empleado] = { ...diario[c.concepto][c.empleado], [c.fecha]: horas };
    }
  }
  return { indice, diario };
}

// Horas de una persona en un concepto, sumando sus días
export function sumarDias(porDia = {}) {
  return Object.values(porDia).reduce((total, horas) => total + (horas || 0), 0);
}

// {concepto: {empleado: {fecha: horas}}} -> {concepto: {empleado: total de la semana}}, para la tabla
export function totalesDiarios(diario) {
  return Object.fromEntries(
    Object.entries(diario).map(([concepto, porEmpleado]) => [
      concepto,
      Object.fromEntries(Object.entries(porEmpleado).map(([empleado, dias]) => [empleado, sumarDias(dias)])),
    ])
  );
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

// Múltiplo de media hora (0,5 · 1 · 1,5…)
export function esMediaHora(valor) {
  return Math.abs(valor * 2 - Math.round(valor * 2)) < 1e-9;
}

// Estado del editor -> celdas para la API (solo las que tienen horas)
export function aplanarCeldas(indice, diario) {
  const celdas = [];
  for (const [proyecto, porEmpleado] of Object.entries(indice)) {
    for (const [empleado, horas] of Object.entries(porEmpleado)) {
      if (horas) celdas.push({ concepto: CONCEPTO_PROYECTO, proyecto, empleado, fecha: null, horas });
    }
  }
  for (const [concepto, porEmpleado] of Object.entries(diario)) {
    for (const [empleado, dias] of Object.entries(porEmpleado)) {
      for (const [fecha, horas] of Object.entries(dias)) {
        if (horas) celdas.push({ concepto, proyecto: null, empleado, fecha, horas });
      }
    }
  }
  return celdas;
}