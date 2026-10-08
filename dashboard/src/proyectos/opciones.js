// Todas las opciones: para filtrar y para mostrar
export const TIPOS = ["Contrato", "Contrato basado", "Acuerdo marco", "Subvención"];
export const VIAS = ["Heredada", "Contrato menor", "Licitación pública", "Subvención"];
export const ESTADOS = ["Oportunidad", "Aceptado", "En curso", "Cerrado", "Rechazado"];

// Opciones al crear un proyecto suelto: un contrato basado solo nace de un acuerdo marco
export const TIPOS_SUELTOS = ["Contrato", "Acuerdo marco", "Subvención"];

// Vías que puede elegir un proyecto que no es subvención
export const VIAS_NO_SUBVENCION = ["Heredada", "Contrato menor", "Licitación pública"];