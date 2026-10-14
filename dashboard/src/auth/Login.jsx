import { useState } from "react";
import { NOMBRE_APP } from "../lib/marca";

export default function Login({ onLogin }) {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  const enviar = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await onLogin({ username: usuario, password });
    } catch (err) {
      setError(err?.message || "Usuario o contraseña incorrectos");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-salvia-900 px-4">
      <form
        onSubmit={enviar}
        className="w-full max-w-sm space-y-5 rounded-2xl bg-white p-8 shadow-2xl"
      >
        <div>
          <div className="mb-4 h-1.5 w-12 rounded-full bg-salvia" />
          <h1 className="text-2xl font-bold text-salvia-950">{NOMBRE_APP}</h1>
          <p className="mt-1 text-sm text-salvia-950/50">Inicia sesión para continuar</p>
        </div>

        <input
          className="w-full rounded-lg border border-salvia-900/15 px-3 py-2.5 outline-none focus:border-salvia-900 focus:ring-2 focus:ring-salvia"
          placeholder="Email"
          autoComplete="username"
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
        />
        <input
          type="password"
          className="w-full rounded-lg border border-salvia-900/15 px-3 py-2.5 outline-none focus:border-salvia-900 focus:ring-2 focus:ring-salvia"
          placeholder="Contraseña"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && (
          <p className="rounded-lg border-l-4 border-salvia-900 bg-salvia-100 px-3 py-2 text-sm text-salvia-950">
            {error}
          </p>
        )}

        <button className="w-full rounded-lg bg-salvia-900 py-2.5 font-semibold text-salvia-200 hover:bg-salvia hover:text-salvia-950">
          Entrar
        </button>
      </form>
    </div>
  );
}