import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useFrappeAuth, useFrappeGetCall } from "frappe-react-sdk";
import Login from "./auth/Login";
import Cabecera from "./layout/Cabecera";
import SinModulos from "./layout/SinModulos";
import { MODULOS } from "./modulos";
import { useEsMovil } from "./hooks/useEsMovil";

function Aplicacion({ onCerrarSesion }) {
  const esMovil = useEsMovil();
  const { data, error, isLoading } = useFrappeGetCall("prototipo.api.sesion.mi_perfil");

  // Reserva el hueco de la barra de desplazamiento: así la cabecera y el contenido miden lo mismo
  // en páginas cortas (sin barra) y largas (con barra)
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
  // En móvil, solo los módulos marcados como "movil" (por ahora, Carga de horas)
  const disponibles = MODULOS.filter((m) => perfil.modulos.includes(m.clave) && (!esMovil || m.movil));

  return (
    <div className="min-h-screen bg-salvia-50 text-salvia-950">
      <Cabecera nombre={perfil.nombre} modulos={disponibles} onCerrarSesion={onCerrarSesion} />

      <main className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-10">
        <Routes>
          {disponibles.map((m) => (
            <Route key={m.clave} path={m.ruta} element={<m.Componente />} />
          ))}
          {/* Cualquier otra ruta: al primer módulo disponible o a la pantalla vacía */}
          <Route
            path="*"
            element={
              disponibles.length > 0 ? (
                <Navigate to={disponibles[0].ruta} replace />
              ) : (
                <SinModulos />
              )
            }
          />
        </Routes>
      </main>
    </div>
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