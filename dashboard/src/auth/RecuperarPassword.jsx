import { useState } from "react";
import { useFrappePostCall } from "frappe-react-sdk";

const CAMPO =
  "w-full rounded-lg border border-salvia-900/15 px-3 py-2.5 outline-none focus:border-salvia-900 focus:ring-2 focus:ring-salvia";

export default function RecuperarPassword({ emailInicial, onVolver }) {
  const [email, setEmail] = useState(emailInicial || "");
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState(null);

  const { call, loading } = useFrappePostCall("prototipo.api.recuperacion.solicitar_recuperacion");

  const enviar = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await call({ email });
      setEnviado(true);
    } catch (err) {
      if (err?.exc_type === "RateLimitExceededError" || err?.httpStatus === 429) {
        setError("Has hecho demasiadas solicitudes. Inténtalo de nuevo dentro de una hora.");
      } else {
        setError("No se ha podido enviar la solicitud. Inténtalo de nuevo más tarde.");
      }
    }
  };

  if (enviado) {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-bold text-salvia-950">Revisa tu correo</h2>
          <p className="mt-2 text-sm text-salvia-950/70">
            Si <strong className="text-salvia-950">{email}</strong> está registrado, recibirás un
            enlace para restablecer tu contraseña. Puede tardar unos minutos; revisa también la
            carpeta de correo no deseado.
          </p>
        </div>
        <button
          type="button"
          onClick={onVolver}
          className="w-full rounded-lg bg-salvia-900 py-2.5 font-semibold text-salvia-200 hover:bg-salvia hover:text-salvia-950"
        >
          Volver al inicio de sesión
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-salvia-950">Recuperar contraseña</h2>
        <p className="mt-1 text-sm text-salvia-950/50">
          Indica el correo de tu cuenta y te enviaremos un enlace para elegir una contraseña nueva.
        </p>
      </div>

      <input
        type="email"
        required
        className={CAMPO}
        placeholder="Email"
        autoComplete="username"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      {error && (
        <p className="rounded-lg border-l-4 border-salvia-900 bg-salvia-100 px-3 py-2 text-sm text-salvia-950">
          {error}
        </p>
      )}

      <button
        disabled={loading || !email.trim()}
        className="w-full rounded-lg bg-salvia-900 py-2.5 font-semibold text-salvia-200 hover:bg-salvia hover:text-salvia-950 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Enviando…" : "Enviar enlace"}
      </button>

      <button
        type="button"
        onClick={onVolver}
        className="w-full text-sm font-medium text-salvia-950/60 underline-offset-4 hover:text-salvia-950 hover:underline"
      >
        Volver al inicio de sesión
      </button>
    </form>
  );
}