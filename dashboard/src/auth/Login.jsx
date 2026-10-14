import { useState } from "react";
import { NOMBRE_APP } from "../lib/marca";
import logo from "../images/Khora_Symbol_CMYK.svg";

const CAMPO =
  "w-full rounded-xl border border-salvia-200 bg-salvia-50/60 px-4 py-3 text-salvia-950 outline-none transition placeholder:text-salvia-950/30 focus:border-salvia-500 focus:bg-white focus:ring-4 focus:ring-salvia/30";

export default function Login({ onLogin }) {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [entrando, setEntrando] = useState(false);
  const [error, setError] = useState(null);

  const enviar = async (e) => {
    e.preventDefault();
    setError(null);
    setEntrando(true);
    try {
      await onLogin({ username: usuario, password });
    } catch (err) {
      setError(err?.message || "Usuario o contraseña incorrectos");
    } finally {
      setEntrando(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-salvia-50 via-salvia-100 to-salvia-300 px-4">
      {/* Manchas decorativas de fondo */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-salvia-300/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-24 h-[28rem] w-[28rem] rounded-full bg-salvia-500/25 blur-3xl" />

      <div className="relative w-full max-w-md">
        <form
          onSubmit={enviar}
          className="space-y-6 rounded-3xl bg-white/90 p-10 shadow-xl shadow-salvia-900/10 ring-1 ring-salvia-200 backdrop-blur"
        >
          <div className="flex flex-col items-center text-center">
            <img src={logo} alt="" className="mb-5 h-20 w-auto" />
            <h1 className="text-2xl font-bold text-salvia-900">¡Hola de nuevo!</h1>
            <p className="mt-1.5 text-sm text-salvia-950/60">
              Inicia sesión en {NOMBRE_APP} para continuar
            </p>
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-salvia-900">Correo electrónico</span>
              <input
                className={CAMPO}
                placeholder="nombre@empresa.com"
                autoComplete="username"
                autoFocus
                required
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-salvia-900">Contraseña</span>
              <div className="relative">
                <input
                  type={verPassword ? "text" : "password"}
                  className={`${CAMPO} pr-20`}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setVerPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2.5 py-1 text-xs font-medium text-salvia-700 hover:bg-salvia-100"
                >
                  {verPassword ? "Ocultar" : "Mostrar"}
                </button>
              </div>
            </label>
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          <button
            disabled={entrando}
            className="w-full rounded-xl bg-salvia-700 py-3 font-semibold text-white shadow-md shadow-salvia-700/20 transition hover:bg-salvia-800 focus:outline-none focus:ring-4 focus:ring-salvia/40 disabled:cursor-wait disabled:opacity-70"
          >
            {entrando ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-salvia-900/50">Khora Urban Thinkers</p>
      </div>
    </div>
  );
}
