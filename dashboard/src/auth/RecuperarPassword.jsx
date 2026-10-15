import { useState } from "react";
import { useFrappePostCall } from "frappe-react-sdk";
import { CAMPO, BOTON_PRINCIPAL, ENLACE } from "./Login";
import { DOMINIO_CORREO, completarDominio } from "../lib/correo";

export default function RecuperarPassword({ logo, emailInicial, onVolver }) {
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

  const cabecera = (titulo, texto) => (
    <div className="flex flex-col items-center text-center">
      <img src={logo} alt="" className="mb-5 h-20 w-auto" />
      <h1 className="text-2xl font-bold text-salvia-900">{titulo}</h1>
      <p className="mt-1.5 text-sm text-salvia-950/60">{texto}</p>
    </div>
  );

  if (enviado) {
    return (
      <div className="space-y-6">
        {cabecera(
          "Revisa tu correo",
          <>
            Si <strong className="text-salvia-900">{email}</strong> está registrado, recibirás un
            enlace para restablecer tu contraseña. Revisa también la carpeta de correo no deseado.
          </>
        )}
        <button type="button" onClick={onVolver} className={BOTON_PRINCIPAL}>
          Volver al inicio de sesión
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="space-y-6">
      {cabecera(
        "Recuperar contraseña",
        "Indica el correo de tu cuenta y te enviaremos un enlace para elegir una contraseña nueva."
      )}

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-salvia-900">Correo electrónico</span>
        <input
          type="email"
          required
          autoFocus
          className={CAMPO}
          placeholder={`nombre@${DOMINIO_CORREO}`}
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(completarDominio(email, e.target.value))}
        />
      </label>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      <button disabled={loading || !email.trim()} className={BOTON_PRINCIPAL}>
        {loading ? "Enviando…" : "Enviar enlace"}
      </button>

      <button type="button" onClick={onVolver} className={ENLACE}>
        Volver al inicio de sesión
      </button>
    </form>
  );
}