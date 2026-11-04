import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { NOMBRE_APP } from "../lib/marca";
import logo from "../images/Khora_Symbol_CMYK.svg";

// Menú desplegable de móvil: nombre del usuario y "Cerrar sesión"
function MenuUsuario({ nombre, onCerrarSesion }) {
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef(null);

  // Cerrar al tocar fuera o con Escape
  useEffect(() => {
    if (!abierto) return;
    const alTocarFuera = (e) => !contenedor.current?.contains(e.target) && setAbierto(false);
    const alPulsar = (e) => e.key === "Escape" && setAbierto(false);
    document.addEventListener("mousedown", alTocarFuera);
    document.addEventListener("keydown", alPulsar);
    return () => {
      document.removeEventListener("mousedown", alTocarFuera);
      document.removeEventListener("keydown", alPulsar);
    };
  }, [abierto]);

  return (
    <div ref={contenedor} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        aria-expanded={abierto}
        aria-haspopup="menu"
        aria-label="Menú de usuario"
        className="grid h-10 w-10 place-items-center rounded-lg text-white hover:bg-salvia hover:text-salvia-950"
      >
        {/* Icono "bars-3" de Heroicons (MIT) */}
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>

      {abierto && (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-60 overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-salvia-900/10"
        >
          <div className="border-b border-salvia-900/10 px-4 py-3">
            <div className="text-xs text-salvia-950/50">Sesión iniciada como</div>
            <div className="truncate text-sm font-semibold text-salvia-950">{nombre}</div>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={onCerrarSesion}
            className="w-full px-4 py-3 text-left text-sm font-medium text-salvia-950 hover:bg-salvia-50"
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}

export default function Cabecera({ nombre, modulos, onCerrarSesion }) {
  return (
    <header className="bg-salvia-900">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-8 px-4 md:px-8">
        <div className="flex h-full items-center gap-10">
          <img src={logo} alt={NOMBRE_APP} className="h-9 w-auto py-0.5" />

          {/* Módulos: solo en escritorio (en móvil solo hay Carga de horas) */}
          <nav aria-label="Módulos" className="hidden h-full gap-1 md:flex">
            {modulos.map((m) => (
              <NavLink
                key={m.clave}
                to={m.ruta}
                className={({ isActive }) =>
                  `relative flex items-center px-4 text-sm font-semibold transition-colors ${
                    isActive
                      ? "text-salvia-200 after:absolute after:inset-x-4 after:bottom-0 after:h-1 after:rounded-t after:bg-salvia"
                      : "text-white/60 hover:text-white"
                  }`
                }
              >
                {m.etiqueta}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Escritorio: nombre y botón a la vista */}
        <div className="hidden items-center gap-4 text-sm text-white md:flex">
          <span>{nombre}</span>
          <button
            onClick={onCerrarSesion}
            className="rounded-lg border border-white/20 px-3 py-1.5 hover:bg-salvia hover:text-salvia-950"
          >
            Cerrar sesión
          </button>
        </div>

        {/* Móvil: menú desplegable */}
        <div className="md:hidden">
          <MenuUsuario nombre={nombre} onCerrarSesion={onCerrarSesion} />
        </div>
      </div>
    </header>
  );
}