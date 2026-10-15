// Plantilla de columnas compartida por cabecera, filas y subcontratos, con el ancho mínimo de la
// tabla (suma de columnas, huecos y relleno), que cabe en el ancho de la página (max-w-7xl):
// flecha | código | cliente | descripción | tipo | vía | importe | estado | acciones

export const GRID =
  "grid grid-cols-[2rem_7.5rem_minmax(9rem,1fr)_minmax(12rem,2fr)_8.5rem_8.5rem_7.5rem_7rem_6.5rem] items-center gap-x-2";
export const ANCHO_MINIMO = "min-w-[1190px]";