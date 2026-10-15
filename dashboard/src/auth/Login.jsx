import { useState } from "react";
import { NOMBRE_APP } from "../lib/marca";
import RecuperarPassword from "./RecuperarPassword";

const CAMPO =
  "w-full rounded-lg border border-salvia-900/15 px-3 py-2.5 outline-none focus:border-salvia-900 focus:ring-2 focus:ring-salvia";

export default function Login({ onLogin }) {
  const [vista, setVista] = useState("login"); // "login" o "recuperar"
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
      <div className="w-full max-w-sm space-y-5 rounded-2xl bg-white p-8 shadow-2xl">
        <div>
          <div className="mb-4 h-1.5 w-12 rounded-full bg-salvia" />
          <h1 className="text-2xl font-bold text-salvia-950">{NOMBRE_APP}</h1>
        </div>

        {vista === "recuperar" ? (
          <RecuperarPassword emailInicial={usuario} onVolver={() => setVista("login")} />
        ) : (
          <form onSubmit={enviar} className="space-y-5">
            <p className="-mt-3 text-sm text-salvia-950/50">Inicia sesión para continuar</p>

            <input
              className={CAMPO}
              placeholder="Email"
              autoComplete="username"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
            />
            <input
              type="password"
              className={CAMPO}
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

            <button
              type="button"
              onClick={() => {
                setError(null);
                setVista("recuperar");
              }}
              className="w-full text-sm font-medium text-salvia-950/60 underline-offset-4 hover:text-salvia-950 hover:underline"
            >
              ¿Has olvidado tu contraseña?
            </button>
          </form>
        )}
      </div>
    </div>
  );
}