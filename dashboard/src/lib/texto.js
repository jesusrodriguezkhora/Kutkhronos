// Minúsculas y sin tildes, para que "garcia" encuentre "García"
export function normalizar(texto) {
  return (texto || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}
