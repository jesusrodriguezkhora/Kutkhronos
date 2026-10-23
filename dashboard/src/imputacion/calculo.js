// Cálculos de la tabla de imputación (sin React)
import { aISO } from "../planificacion/calculo";

export const CONCEPTO_PROYECTO = "Proyecto";
export const CONCEPTO_VACACIONES = "Vacaciones";

// Máximo de horas en un día, sumando todas las filas (mismo que MAXIMO_DIARIO en el servidor)
export const MAXIMO_DIARIO = 24;

// Lunes de la semana de hoy, como "AAAA-MM-DD"
export function lunesActual() {
  const hoy = new Date();
  return aISO(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - ((hoy.getDay() + 6) % 7)));
}

// "2026-10-27" -> "2026-10-26": último día en que se puede imputar (el cierre es el martes a las 00:00)
export function ultimoDiaParaImputar(cierre) {
  const [a, m, d] = cierre.split("-").map(Number);
  return aISO(new Date(a, m - 1, d - 1));
}

// Clave de la fila de una celda: el código del proyecto o el nombre del concepto
export const claveFila = (celda) => (celda.concepto === CONCEPTO_PROYECTO ? celda.proyecto : celda.concepto);

// Celdas de la API -> {fila: {fecha: horas}}
export function indexarCeldas(celdas) {
  const indice = {};
  for (const c of celdas) {
    const fila = claveFila(c);
    indice[fila] = { ...indice[fila], [c.fecha]: Number(c.horas) || 0 };
  }
  return indice;
}

// Vacaciones de la semana (de la planificación, solo lectura) -> {fecha: horas}
export function vacacionesPorDia(dias) {
  return Object.fromEntries(dias.filter((d) => d.vacaciones).map((d) => [d.fecha, d.vacaciones]));
}

// Filas de la tabla: proyectos y filas fijas (las vacaciones se ven en la columna del día, no como fila)
export function filasDe(info) {
  return [
    ...info.filas.map((p) => ({
      clave: p.name,
      titulo: p.name,
      subtitulo: [p.cliente, p.descripcion].filter(Boolean).join(" · "),
      planificado: p.planificado,
      concepto: CONCEPTO_PROYECTO,
    })),
    ...info.conceptos.map((c) => ({
      clave: c.concepto,
      titulo: c.concepto,
      planificado: c.planificado,
      concepto: c.concepto,
      fija: true,
    })),
  ];
}

// Totales por fila, por día y general (las vacaciones cuentan en el total del día)
export function calcularTotales(indice, filas, dias) {
  const porFila = {};
  const porDia = Object.fromEntries(dias.map((d) => [d.fecha, 0]));
  let general = 0;
  for (const fila of filas) {
    let total = 0;
    for (const d of dias) {
      const horas = indice[fila.clave]?.[d.fecha] || 0;
      total += horas;
      porDia[d.fecha] += horas;
    }
    porFila[fila.clave] = total;
    general += total;
  }
  return { porFila, porDia, general };
}