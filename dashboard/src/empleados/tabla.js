// Plantillas de columnas compartidas por cabecera y filas, con el ancho mínimo de la tabla
// (suma de columnas, huecos y relleno). Ambas caben en el ancho de la página (max-w-7xl).

// nombre | correo | teléfono | rol | estado | alta | acciones
export const GRID =
  "grid grid-cols-[minmax(12rem,1.5fr)_minmax(14rem,1.5fr)_9rem_8rem_7rem_7rem_5rem] items-center gap-x-4";
export const ANCHO_MINIMO = "min-w-[1120px]";

// Con los datos laborales: nombre | correo | teléfono | rol | posición | €/h | estado | alta | acciones
export const GRID_LABORAL =
  "grid grid-cols-[minmax(10rem,1.2fr)_minmax(11rem,1.3fr)_7.5rem_7.5rem_8.5rem_5.5rem_6rem_6rem_5rem] items-center gap-x-3";
export const ANCHO_MINIMO_LABORAL = "min-w-[1200px]";
