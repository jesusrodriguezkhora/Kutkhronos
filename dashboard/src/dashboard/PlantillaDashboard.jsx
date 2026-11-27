import { usePerfil } from "../hooks/usePerfil";

// Estructura común de todos los dashboards: cabecera (título y saludo) y el contenido de
// cada perfil debajo. Para añadir un bloque a un dashboard, usar <BloqueDashboard> dentro.
export default function PlantillaDashboard({ children }) {
  const perfil = usePerfil();
  const nombre = perfil?.nombre?.split(" ")[0];

  return (
    <section className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        {nombre && <p className="mt-1 text-sm text-salvia-950/60">Hola, {nombre}</p>}
      </header>
      {children}
    </section>
  );
}

// Bloque con título de un dashboard (KPIs, proyectos…)
export function BloqueDashboard({ titulo, subtitulo, children }) {
  return (
    <section className="space-y-4">
      {(titulo || subtitulo) && (
        <div>
          {titulo && <h2 className="text-lg font-bold">{titulo}</h2>}
          {subtitulo && <p className="mt-0.5 text-xs text-salvia-950/50">{subtitulo}</p>}
        </div>
      )}
      {children}
    </section>
  );
}
