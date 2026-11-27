import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useFrappeAuth, useFrappeGetCall } from "frappe-react-sdk";
import Login from "./auth/Login";
import Layout from "./layout/Layout";
import SinModulos from "./layout/SinModulos";
import { navegacionDisponible, paginasDe } from "./navegacion";
import { ETIQUETA_PERFIL } from "./dashboard/perfiles";
import { useEsMovil } from "./hooks/useEsMovil";

// Rutas de la SPA a partir del menú disponible (ver navegacion.jsx): cada página, las direcciones
// antiguas que redirigen a ella y la de cada categoría, que lleva a su primera página
function rutasDe(navegacion) {
  const paginas = paginasDe(navegacion);
  const ocupadas = new Set(paginas.map((p) => p.ruta));
  const redirecciones = [];
  const redirigir = (desde, hacia) => {
    if (ocupadas.has(desde)) return;
    ocupadas.add(desde);
    redirecciones.push({ desde, hacia });
  };

  paginas.forEach((p) => (p.antiguas ?? []).forEach((a) => redirigir(a, p.ruta)));
  navegacion.filter((e) => e.hijos).forEach((e) => redirigir(e.ruta, e.hijos[0].ruta));

  return { paginas, redirecciones };
}

function Aplicacion({ onCerrarSesion }) {
  const esMovil = useEsMovil();
  const { data, error, isLoading } = useFrappeGetCall("prototipo.api.sesion.mi_perfil");

  // Reserva el hueco de la barra de desplazamiento: así el contenido mide lo mismo en páginas cortas
  // (sin barra) y largas (con barra)
  useEffect(() => {
    document.documentElement.classList.add("con-aplicacion");
    return () => document.documentElement.classList.remove("con-aplicacion");
  }, []);

  if (isLoading) {
    return <p className="p-8 text-salvia-950/50">Cargando…</p>;
  }

  if (error) {
    return (
      <div className="p-8 text-sm">
        <p className="text-red-600">No se ha podido cargar tu perfil.</p>
        <button onClick={onCerrarSesion} className="mt-4 underline">
          Volver al inicio de sesión
        </button>
      </div>
    );
  }

  const perfil = data.message;
  // En móvil, solo las páginas marcadas como "movil" (por ahora, Carga de horas)
  const navegacion = navegacionDisponible(perfil.modulos, esMovil);
  const { paginas, redirecciones } = rutasDe(navegacion);

  return (
    <Routes>
      <Route
        element={
          <Layout
            navegacion={navegacion}
            nombre={perfil.nombre}
            rol={ETIQUETA_PERFIL[perfil.dashboard]}
            onCerrarSesion={onCerrarSesion}
          />
        }
      >
        {paginas.map((p) => (
          <Route key={p.ruta} path={p.ruta} element={<p.Componente />} />
        ))}
        {redirecciones.map((r) => (
          <Route key={r.desde} path={r.desde} element={<Navigate to={r.hacia} replace />} />
        ))}
        {/* Cualquier otra ruta: a la primera página disponible o a la pantalla vacía */}
        <Route
          path="*"
          element={paginas.length > 0 ? <Navigate to={paginas[0].ruta} replace /> : <SinModulos />}
        />
      </Route>
    </Routes>
  );
}

export default function Inicio() {
  const { currentUser, isLoading, login, logout } = useFrappeAuth();

  const cerrarSesion = async () => {
    await logout();
    // Recargar borra toda la memoria de la página (caché incluida) antes del siguiente usuario
    window.location.reload();
  };

  if (isLoading) {
    return <p className="p-8 text-salvia-950/50">Cargando…</p>;
  }

  if (!currentUser) {
    return <Login onLogin={login} />;
  }

  return <Aplicacion onCerrarSesion={cerrarSesion} />;
}
