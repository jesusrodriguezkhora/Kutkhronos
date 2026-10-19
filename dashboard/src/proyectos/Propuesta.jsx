// Pestaña Propuesta de la ficha del proyecto (fee estimate). De momento, solo el hueco.
export default function Propuesta({ proyecto }) {
  return (
    <div className="overflow-y-auto p-6 text-sm text-salvia-950/60">
      Propuesta de <span className="font-mono">{proyecto}</span>.
    </div>
  );
}