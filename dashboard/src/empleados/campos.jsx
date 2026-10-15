import { useState } from "react";
import { POSICIONES, SEMANAS_ANIO, calcularCosteHora, clases } from "./formulario";
import { formatearCosteHora } from "../lib/formato";

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

// Posición, salario y horas, con el coste por hora calculado al momento.
// Solo se muestra a los roles que ven los datos laborales (mi_perfil.ve_datos_laborales).
export function CamposLaborales({ datos, onCambiar }) {
  const coste = calcularCosteHora(datos.salario_anual, datos.horas_semanales);
  const horasAnio = Number(datos.horas_semanales) * SEMANAS_ANIO;

  return (
    <>
      <div className="border-t border-salvia-900/10 pt-4 sm:col-span-2">
        <h3 className="text-sm font-bold">Datos laborales</h3>
        <p className="mt-1 text-xs text-salvia-950/50">
          Opcionales. Solo los ven CEO y Administración.
        </p>
      </div>

      <label className="block">
        <span className={clases.etiqueta}>Posición</span>
        <select
          className={clases.campo}
          value={datos.posicion}
          onChange={(e) => onCambiar("posicion", e.target.value)}
        >
          <option value="">—</option>
          {POSICIONES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </label>
      <div />

      <Campo
        etiqueta="Salario bruto anual (€)"
        type="number"
        min="0"
        step="any"
        inputMode="decimal"
        value={datos.salario_anual}
        onChange={(e) => onCambiar("salario_anual", e.target.value)}
      />
      <Campo
        etiqueta="Horas semanales"
        type="number"
        min="0"
        max="168"
        step="any"
        inputMode="decimal"
        value={datos.horas_semanales}
        onChange={(e) => onCambiar("horas_semanales", e.target.value)}
      />

      <div className="rounded-lg bg-salvia-900/5 px-3 py-2 text-sm sm:col-span-2">
        <span className="font-semibold">Coste por hora: </span>
        {coste === null ? (
          <span className="text-salvia-950/50">indica el salario y las horas semanales</span>
        ) : (
          <>
            {formatearCosteHora(coste)}
            <span className="text-salvia-950/50">
              {" "}
              ({horasAnio.toLocaleString("es-ES")} horas al año: {SEMANAS_ANIO} semanas ×{" "}
              {Number(datos.horas_semanales).toLocaleString("es-ES")} h)
            </span>
          </>
        )}
      </div>
    </>
  );
}
