// Dominio del correo de la empresa: todas las cuentas lo usan
export const DOMINIO_CORREO = "khoraurbanthinkers.es";

// Para el onChange de los campos de correo: al teclear la @ se completa el dominio
// ("ana@" → "ana@khoraurbanthinkers.es"). Al borrar no hace nada, así que se puede escribir otro.
export function completarDominio(anterior, nuevo) {
  const acabaDeEscribirArroba =
    nuevo.length === anterior.length + 1 && nuevo.endsWith("@") && !anterior.includes("@");
  return acabaDeEscribirArroba ? nuevo + DOMINIO_CORREO : nuevo;
}
