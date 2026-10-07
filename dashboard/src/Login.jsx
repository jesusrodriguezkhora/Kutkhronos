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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 to-fuchsia-600">
      <form
        onSubmit={enviar}
        className="w-80 rounded-2xl bg-white p-8 shadow-2xl space-y-4"
      >
        <h1 className="text-2xl font-bold text-slate-800">Prototipo</h1>
        <input
          className="w-full rounded-lg border px-3 py-2"
          placeholder="Usuario o email"
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
        />
        <input
          type="password"
          className="w-full rounded-lg border px-3 py-2"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="w-full rounded-lg bg-indigo-600 py-2 font-medium text-white hover:bg-indigo-700">
          Entrar
        </button>
      </form>
    </div>
  );
}