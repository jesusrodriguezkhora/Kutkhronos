import { useFrappeAuth } from "frappe-react-sdk";
import Login from "./Login";
import Proyectos from "./Proyectos";

export default function Inicio() {
  const { currentUser, isLoading, login, logout } = useFrappeAuth();

  if (isLoading) {
    return <p className="p-8 text-black/50">Cargando…</p>;
  }

  if (!currentUser) {
    return <Login onLogin={login} />;
  }

  return (
    <div className="min-h-screen bg-white text-black">
      <header className="flex items-center justify-between bg-black px-8 py-4">
        <span className="text-lg font-bold text-[#fadc6a]">Khronos</span>
        <div className="flex items-center gap-4 text-sm text-white">
          <span>{currentUser}</span>
          <button
            onClick={logout}
            className="rounded-lg border border-white/20 px-3 py-1.5 hover:bg-[#fadc6a] hover:text-black"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-8 py-10">
        <Proyectos />
      </main>
    </div>
  );
}