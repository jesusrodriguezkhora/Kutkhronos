// Duración de un proyecto: mismas reglas que calcular_duracion en proyecto.py
import { aISO } from "../planificacion/calculo";

export const UNIDADES = ["Meses", "Años"];

const partes = (iso) => iso.split("-").map(Number);

// "2026-01-31" + 1 -> "2026-02-28": mismo día N meses después (o el último día del mes si no existe)
export function sumarMeses(iso, meses) {
  const [a, m, d] = partes(iso);
  const total = m - 1 + meses;
  const anio = a + Math.floor(total / 12);
  const mes = ((total % 12) + 12) % 12;
  const ultimoDia = new Date(anio, mes + 1, 0).getDate();
  return aISO(new Date(anio, mes, Math.min(d, ultimoDia)));
}

// Meses de inicio a fin, redondeando al siguiente mes entero
export function mesesEntre(inicio, fin) {
  const [a1, m1] = partes(inicio);
  const [a2, m2] = partes(fin);
  let meses = (a2 - a1) * 12 + (m2 - m1);
  if (sumarMeses(inicio, meses) > fin) meses -= 1;
  if (sumarMeses(inicio, meses) < fin) meses += 1;
  return Math.max(meses, 0);
}

// Duración (en la unidad elegida) a meses enteros, redondeando hacia arriba
export function aMeses(duracion, unidad) {
  return Math.ceil(Number(duracion) * (unidad === "Años" ? 12 : 1) - 1e-9);
}

// Duración a partir de las fechas, en la unidad elegida ("" si no se puede calcular)
export function duracionDesdeFechas(inicio, fin, unidad) {
  if (!inicio || !fin || fin < inicio) return "";
  const meses = mesesEntre(inicio, fin);
  return unidad === "Años" ? Math.round((meses / 12) * 100) / 100 : meses;
}

// Fecha de fin a partir de la duración ("" si no se puede calcular)
export function finDesdeDuracion(inicio, duracion, unidad) {
  if (!inicio || !(Number(duracion) > 0)) return "";
  return sumarMeses(inicio, aMeses(duracion, unidad));
}

// "6 meses", "1 mes", "3,25 años"
export function textoDuracion(duracion, unidad) {
  if (duracion === "" || duracion == null) return "";
  const n = Number(duracion);
  const numero = n.toLocaleString("es-ES", { maximumFractionDigits: 2 });
  if (unidad === "Años") return `${numero} ${n === 1 ? "año" : "años"}`;
  return `${numero} ${n === 1 ? "mes" : "meses"}`;
}