import { normalizar } from "../lib/texto";

// Palabras que no distinguen a un cliente de otro: formas jurídicas y palabras vacías
const IGNORADAS = new Set([
  "sl", "slu", "sa", "sau", "sll", "scoop", "coop", "sociedad", "limitada", "anonima",
  "de", "del", "la", "las", "el", "los", "y", "e", "en", "the", "and", "of", "inc", "ltd",
]);

// "Construcciones García, S.L." → ["construcciones", "garcia"]
function palabras(texto) {
  return normalizar(texto)
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((p) => p.length > 1 && !IGNORADAS.has(p));
}

// Distancia de edición (cuántas letras hay que cambiar para pasar de a a b)
function distancia(a, b) {
  let anterior = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const actual = [i];
    for (let j = 1; j <= b.length; j++) {
      const coste = a[i - 1] === b[j - 1] ? 0 : 1;
      actual[j] = Math.min(anterior[j] + 1, actual[j - 1] + 1, anterior[j - 1] + coste);
    }
    anterior = actual;
  }
  return anterior[b.length];
}

// Dos palabras se parecen si una empieza por la otra ("constr" / "construcciones")
// o si se diferencian en pocas letras ("garcia" / "garcya")
function palabrasParecidas(a, b) {
  if (a.length >= 3 && b.startsWith(a)) return true;
  if (b.length >= 3 && a.startsWith(b)) return true;
  const larga = Math.max(a.length, b.length);
  return larga >= 4 && distancia(a, b) <= (larga >= 8 ? 2 : 1);
}

// Puntuación de 0 a 1: proporción de palabras escritas que aparecen en el nombre del cliente
function parecido(escritas, cliente) {
  const delCliente = palabras(cliente);
  if (!delCliente.length) return 0;
  const coinciden = escritas.filter((p) => delCliente.some((c) => palabrasParecidas(p, c)));
  return coinciden.length / escritas.length;
}

// Clientes cuyo nombre se parece al texto, de más a menos parecido
export function clientesParecidos(texto, clientes, { excepto, maximo = 6 } = {}) {
  const escritas = palabras(texto);
  if (!escritas.length || escritas.join("").length < 3) return [];

  return clientes
    .filter((c) => c.name !== excepto)
    .map((c) => ({ cliente: c, puntos: parecido(escritas, c.customer_name) }))
    .filter((r) => r.puntos >= 0.5)
    .sort((a, b) => b.puntos - a.puntos)
    .slice(0, maximo)
    .map((r) => r.cliente);
}
