import { useEffect, useRef } from "react";

// Área de texto que crece con el contenido, hasta un máximo a partir del cual hace scroll
export default function AreaTexto({ etiqueta, valor, onChange, clases, filas = 3, placeholder }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [valor]);

  return (
    <label className="block">
      <span className={clases.etiqueta}>{etiqueta}</span>
      <textarea
        ref={ref}
        rows={filas}
        placeholder={placeholder}
        className={`${clases.campo} max-h-80 resize-none overflow-y-auto`}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}