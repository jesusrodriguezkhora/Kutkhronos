// Todas las opciones: para filtrar y para mostrar
export const TIPOS = ["Licitación", "Contrato menor", "Acuerdo marco", "Subvención", "Contrato basado"];
export const ESTADOS = ["Oportunidad", "Propuesta", "Aceptado", "Rechazado"];

// Opciones al crear un proyecto suelto: un contrato basado solo nace de un acuerdo marco
export const TIPOS_SUELTOS = ["Licitación", "Contrato menor", "Acuerdo marco", "Subvención"];

// Estados en los que un acuerdo marco admite contratos basados (mismos que en proyecto.py)
export const ESTADOS_ACUERDO_CON_BASADOS = ["Aceptado"];

// Para pasar a estos estados, los proyectos de estos tipos necesitan un fee estimate guardado (mismo que proyecto.py)
export const ESTADOS_CON_FEE = ["Aceptado"];
export const TIPOS_CON_FEE = ["Licitación", "Contrato menor", "Contrato basado", "Subvención"];

// Estados en los que un proyecto tiene la pestaña Gastos (mismos que ESTADOS_CON_GASTOS en gastos.py)
export const ESTADOS_CON_GASTOS = ["Aceptado"];

// Estados que suman en la fila de total del Pipeline
export const ESTADOS_SUMAN_TOTAL = ["Aceptado"];
