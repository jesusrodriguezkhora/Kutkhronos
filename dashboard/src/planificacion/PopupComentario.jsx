import { useState } from "react";
import Modal from "../componentes/Modal";
import { ESTILOS } from "../lib/estilos";
import { LONGITUD_MAXIMA_COMENTARIO } from "./calculo";

// Comentario de una celda (indicaciones del trabajo planificado). "Aceptar" lo aplica a la tabla;
// se guarda con el botón Guardar de la semana. Vacío = sin comentario.
export default function PopupComentario({ titulo, subtitulo, valor, editable, onAplicar, onCerrar }) {
  const [texto, setTexto] = useState(valor ?? "");
  const hayCambios = texto.trim() !== (valor ?? "").trim();

  return (
    <Modal titulo={titulo} subtitulo={subtitulo} onCerrar={onCerrar} ancho="max-w-md">
      <div className="px-6 py-4">
        {editable ? (
          <>
            <textarea
              className={`${ESTILOS.claro.campo} resize-none`}
              rows={5}
              maxLength={LONGITUD_MAXIMA_COMENTARIO}
              autoFocus
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Indicaciones para el trabajo planificado"
              aria-label="Comentario"
            />
            <p className="mt-1 text-right text-xs text-salvia-950/50">
              {texto.length}/{LONGITUD_MAXIMA_COMENTARIO}
            </p>
          </>
        ) : (
          <p className="whitespace-pre-line text-sm text-salvia-950">{valor}</p>
        )}
      </div>

      <div className="flex justify-end gap-3 border-t border-salvia-900/10 px-6 py-4">
        {editable ? (
          <>
            <button
              type="button"
              onClick={onCerrar}
              className="rounded-lg px-4 py-2 text-sm font-medium text-salvia-950/60 hover:bg-salvia-900/5 hover:text-salvia-950"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => onAplicar(texto.trim())}
              disabled={!hayCambios}
              className="rounded-lg bg-salvia-900 px-5 py-2 text-sm font-semibold text-salvia-200 hover:bg-salvia hover:text-salvia-950 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Aceptar
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-lg bg-salvia-900 px-5 py-2 text-sm font-semibold text-salvia-200 hover:bg-salvia hover:text-salvia-950"
          >
            Cerrar
          </button>
        )}
      </div>
    </Modal>
  );
}