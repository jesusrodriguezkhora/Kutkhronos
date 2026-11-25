// Importe por año: mismas reglas que anios_del_proyecto y repartir_importe en proyecto.py
import { aISO } from "../planificacion/calculo";

const numero = (v) => Number(v) || 0;

function diaAnterior(iso) {
  const [a, m, d] = iso.split("-").map(Number);
  return aISO(new Date(a, m - 1, d - 1));
}

// Años naturales del proyecto (la fecha de fin no cuenta como día trabajado). Sin fechas: []
export function aniosDelProyecto(inicio, fin) {
  if (!inicio || !fin || fin < inicio) return [];
  const ultimo = fin > inicio ? diaAnterior(fin) : fin;
  const anios = [];
  for (let a = Number(inicio.slice(0, 4)); a <= Number(ultimo.slice(0, 4)); a++) anios.push(a);
  return anios;
}

// Reparto por defecto, en céntimos; la diferencia del redondeo va al último año
export function repartir(importe, anios) {
  if (!anios.length) return [];
  const centimos = Math.round(numero(importe) * 100);
  const base = Math.floor(centimos / anios.length);
  const resto = centimos - base * anios.length;
  return anios.map((anio, i) => ({ anio, importe: (base + (i === anios.length - 1 ? resto : 0)) / 100 }));
}

// Filas para unos años: conserva el importe de los años que ya estaban; los nuevos, a 0
export function alinear(filas, anios) {
  const porAnio = Object.fromEntries(filas.map((f) => [Number(f.anio), f.importe]));
  return anios.map((anio) => ({ anio, importe: porAnio[anio] ?? 0 }));
}

export const sumar = (filas) => Math.round(filas.reduce((t, f) => t + numero(f.importe), 0) * 100) / 100;