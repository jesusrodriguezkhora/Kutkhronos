import { NavLink } from "react-router-dom";
import { NOMBRE_APP } from "../lib/marca";

export default function Cabecera({ nombre, modulos, onCerrarSesion }) {
  return (
    <header className="bg-salvia-900">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-8">
        <div className="flex items-center gap-10">
          <span className="py-4 text-lg font-bold text-salvia-200">{NOMBRE_APP}</span>

          <nav aria-label="Módulos" className="flex gap-1">
            {modulos.map((m) => (
              <NavLink
                key={m.clave}
                to={m.ruta}
                className={({ isActive }) =>
                  `relative px-4 py-5 text-sm font-semibold transition-colors ${
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