import { useState } from "react";

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
    <div className="flex min-h-screen items-center justify-center bg-black px-4">
      <form
        onSubmit={enviar}
        className="w-full max-w-sm space-y-5 rounded-2xl bg-white p-8 shadow-2xl"
      >
        <div>
          <div className="mb-4 h-1.5 w-12 rounded-full bg-[#fadc6a]" />
          <h1 className="text-2xl font-bold text-black">Prototipo</h1>
          <p className="mt-1 text-sm text-black/50">Inicia sesión para continuar</p>
        </div>

        <input
          className="w-full rounded-lg border border-black/15 px-3 py-2.5 outline-none focus:border-black focus:ring-2 focus:ring-[#fadc6a]"
          placeholder="Usuario o email"
          autoComplete="username"
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
        />
        <input
          type="password"
          className="w-full rounded-lg border border-black/15 px-3 py-2.5 outline-none focus:border-black focus:ring-2 focus:ring-[#fadc6a]"
          placeholder="Contraseña"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && (
          <p className="rounded-lg border-l-4 border-black bg-[#fadc6a]/40 px-3 py-2 text-sm text-black">
            {error}
          </p>
        )}

        <button className="w-full rounded-lg bg-black py-2.5 font-semibold text-[#fadc6a] hover:bg-[#fadc6a] hover:text-black">
          Entrar
        </button>
      </form>
    </div>
  );
}