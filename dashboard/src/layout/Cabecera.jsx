import { NavLink } from "react-router-dom";
import { NOMBRE_APP } from "../lib/marca";
import logo from "../images/Khora_Symbol_CMYK.svg";

export default function Cabecera({ nombre, modulos, onCerrarSesion }) {
  return (
    <header className="bg-salvia-900">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-8 px-8">
        <div className="flex h-full items-center gap-10">
          <img src={logo} alt={NOMBRE_APP} className="h-9 w-auto py-0.5" />

          <nav aria-label="Módulos" className="flex h-full gap-1">
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

        <div className="flex items-center gap-4 text-sm text-white">
          <span>{nombre}</span>
          <button
            onClick={onCerrarSesion}
            className="rounded-lg border border-white/20 px-3 py-1.5 hover:bg-salvia hover:text-salvia-950"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </header>
  );
}