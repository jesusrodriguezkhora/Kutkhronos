import { Navigate, Route, Routes } from "react-router-dom";
import { useFrappeAuth, useFrappeGetCall } from "frappe-react-sdk";
import Login from "./auth/Login";
import Cabecera from "./layout/Cabecera";
import SinModulos from "./layout/SinModulos";
import { MODULOS } from "./modulos";

function Aplicacion({ onCerrarSesion }) {
  const { data, error, isLoading } = useFrappeGetCall("prototipo.api.sesion.mi_perfil");

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
  const disponibles = MODULOS.filter((m) => perfil.modulos.includes(m.clave));

  return (
    <div className="min-h-screen bg-salvia-50 text-salvia-950">
      <Cabecera nombre={perfil.nombre} modulos={disponibles} onCerrarSesion={onCerrarSesion} />

      <main className="mx-auto max-w-7xl px-8 py-10">
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