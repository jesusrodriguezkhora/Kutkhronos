// Extrae un mensaje legible de un error devuelto por Frappe
export function mensajeDeError(err) {
  try {
    if (err?._server_messages) {
      // _server_messages es un JSON con una lista de mensajes, cada uno a su vez en JSON
      const mensajes = JSON.parse(err._server_messages).map((m) => JSON.parse(m).message);
      return mensajes.join("\n").replace(/<[^>]+>/g, "");
    }
  } catch {
    // Si el formato no es el esperado, seguimos con las alternativas
  }
  if (err?.exception) {
    // Formato "frappe.exceptions.ValidationError: mensaje"
    return err.exception.split(":").slice(1).join(":").trim();
  }
  return err?.message || "Ha ocurrido un error inesperado.";
}