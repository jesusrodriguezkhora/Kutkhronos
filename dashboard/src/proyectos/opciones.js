// Todas las opciones: para filtrar y para mostrar
export const TIPOS = ["Contrato", "Contrato basado", "Acuerdo marco", "Subvención"];
export const VIAS = ["Heredada", "Contrato menor", "Licitación pública", "Subvención", "Contratación directa"];
export const ESTADOS = ["Oportunidad", "Aceptado", "En curso", "Cerrado", "Rechazado"];

// Opciones al crear un proyecto suelto: un contrato basado solo nace de un acuerdo marco
export const TIPOS_SUELTOS = ["Contrato", "Acuerdo marco", "Subvención"];

// Vías que puede elegir un proyecto que no es subvención
export const VIAS_NO_SUBVENCION = ["Contrato menor", "Licitación pública", "Contratación directa"];

// Estados en los que un acuerdo marco admite contratos basados (mismos que en proyecto.py)
export const ESTADOS_ACUERDO_CON_BASADOS = ["Aceptado", "En curso", "Cerrado"];

// Para pasar a estos estados, los proyectos de estos tipos necesitan un fee estimate guardado (mismo que proyecto.py)
export const ESTADOS_CON_FEE = ["Aceptado", "En curso"];
export const TIPOS_CON_FEE = ["Contrato", "Contrato basado", "Subvención"];