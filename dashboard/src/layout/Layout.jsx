import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import BarraLateral from "./BarraLateral";
import { paginasDe } from "../navegacion";
import { NOMBRE_APP } from "../lib/marca";
import { IconoChevronDerecha, IconoMenu } from "../componentes/Iconos";
import logo from "../images/Khora_Symbol_CMYK.svg";

// Barra superior: en escritorio, la ruta de la página (Categoría › Página); en móvil, además, el
// botón que abre el menú lateral
function BarraSuperior({ pagina, onAbrirMenu }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-salvia-900/10 bg-salvia-50/90 px-4 backdrop-blur md:px-8">
      <button
        type="button"
        onClick={onAbrirMenu}
        aria-label="Abrir el menú"
        className="-ml-1 grid h-10 w-10 place-items-center rounded-lg text-salvia-950 hover:bg-salvia-900/5 md:hidden"
      >
        <IconoMenu className="h-6 w-6" />
      </button>
      <img src={logo} alt={NOMBRE_APP} className="h-7 w-7 md:hidden" />

      {pagina && (
        <nav aria-label="Ruta" className="min-w-0 text-sm">
          <ol className="flex items-center gap-1.5">
            {pagina.categoria && (
              <>
                <li className="hidden text-salvia-950/50 sm:block">{pagina.categoria.etiqueta}</li>
                <li aria-hidden="true" className="hidden text-salvia-950/30 sm:block">
                  <IconoChevronDerecha className="h-3.5 w-3.5" />
                </li>
              </>
            )}
            <li aria-current="page" className="truncate font-semibold text-salvia-950">
              {pagina.etiqueta}
            </li>
          </ol>
        </nav>
      )}
    </header>
  );
}

// Layout general de la aplicación: menú lateral persistente a la izquierda (contraído, se expande
// por encima del contenido) y la página a la derecha, aprovechando todo el ancho disponible.
// Las páginas se pintan en <Outlet /> (ver Inicio.jsx).
export default function Layout({ navegacion, nombre, rol, onCerrarSesion }) {
  const { pathname } = useLocation();
  const [menuMovil, setMenuMovil] = useState(false);

  // El cajón del móvil se cierra al cambiar de página y con Escape
  useEffect(() => setMenuMovil(false), [pathname]);
  useEffect(() => {
    if (!menuMovil) return;
    const alPulsar = (e) => e.key === "Escape" && setMenuMovil(false);
    document.addEventListener("keydown", alPulsar);
    return () => document.removeEventListener("keydown", alPulsar);
  }, [menuMovil]);

  const pagina = paginasDe(navegacion).find((p) => p.ruta === pathname);

  return (
    <div className="min-h-screen bg-salvia-50 text-salvia-950 md:flex">
      <BarraLateral
        navegacion={navegacion}
        nombre={nombre}
        rol={rol}
        abiertoMovil={menuMovil}
        onCerrarMovil={() => setMenuMovil(false)}
        onCerrarSesion={onCerrarSesion}
      />

      <div className="min-w-0 flex-1">
        <BarraSuperior pagina={pagina} onAbrirMenu={() => setMenuMovil(true)} />
        <main className="px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto max-w-[1600px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
