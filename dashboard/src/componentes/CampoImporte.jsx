const miles = new Intl.NumberFormat("es-ES", { useGrouping: "always" });

export default function CampoImporte({ etiqueta, valor, onChange, clases, disabled }) {
  const vacio = valor === "" || valor === null || valor === undefined;
  const mostrado = vacio ? "" : miles.format(Number(valor));

  return (
    <label className="block">
      <span className={clases.etiqueta}>{etiqueta}</span>
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          disabled={disabled}
          className={`${clases.campo} pr-8 text-right tabular-nums`}
          value={mostrado}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-salvia-950/40">
          €
        </span>
      </div>
    </label>
  );
}