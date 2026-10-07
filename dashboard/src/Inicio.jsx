import { useFrappeAuth } from "frappe-react-sdk";
import Login from "./Login";
import Proyectos from "./Proyectos";

export default function Inicio() {
  const { currentUser, isLoading, login, logout } = useFrappeAuth();

  if (isLoading) {
    return <p className="p-8 text-slate-500">Cargando…</p>;
  }

  if (!currentUser) {
    return <Login onLogin={login} />;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
        <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Hola, {currentUser}</h1>
            <button
            onClick={logout}
            className="rounded-lg bg-white/10 px-4 py-2 hover:bg-white/20"
            >
            Cerrar sesión
            </button>
        </div>
        <div className="mt-8">
            <Proyectos />
        </div>
    </div>
  );
}