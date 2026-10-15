import { useState } from "react";
import { clases } from "./formulario";

// Campos compartidos por los formularios de alta y edición de empleados

export function Campo({ etiqueta, obligatorio, ...props }) {
  return (
    <label className="block">
      <span className={clases.etiqueta}>
        {etiqueta}
        {obligatorio && <span className="text-salvia-950"> *</span>}
      </span>
      <input className={clases.campo} {...props} />
    </label>
  );
}

// `roles`: los que el usuario puede asignar (mi_perfil.roles_asignables)
export function SelectorRol({ roles, valor, onCambiar }) {
  return (
    <div>
      <span className={clases.etiqueta}>
        Rol<span className="text-salvia-950"> *</span>
      </span>
      <div role="radiogroup" aria-label="Rol" className="flex gap-2">
        {roles.map((rol) => (
          <button
            key={rol}
            type="button"
            role="radio"
            aria-checked={valor === rol}
            onClick={() => onCambiar(rol)}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              valor === rol
                ? "border-salvia-900 bg-salvia-900 text-salvia-200"
                : "border-salvia-900/15 hover:bg-salvia-900/5"
            }`}
          >
            {rol}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Copiable({ etiqueta, valor }) {
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(valor);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      window.alert("No se ha podido copiar. Selecciona el texto y cópialo manualmente.");
    }
  };

  return (
    <div>
      <span className={clases.etiqueta}>{etiqueta}</span>
      <div className="flex gap-2">
        <code className="flex-1 break-all rounded-lg bg-salvia-900/5 px-3 py-2 font-mono text-sm">
          {valor}
        </code>
        <button
          type="button"
          onClick={copiar}
          className="w-24 rounded-lg border border-salvia-900/15 text-sm font-medium hover:bg-salvia"
        >
          {copiado ? "Copiado ✓" : "Copiar"}
        </button>
      </div>
    </div>
  );
}
