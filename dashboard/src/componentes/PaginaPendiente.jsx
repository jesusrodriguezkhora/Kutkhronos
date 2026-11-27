import EstadoVacio from "./EstadoVacio";

// Página del menú que existe pero aún no tiene funcionalidad (Estado, Histórico, Facturas…)
export default function PaginaPendiente({ titulo, texto = "Esta sección está pendiente de definir." }) {
  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{titulo}</h1>
      <EstadoVacio titulo="Próximamente" texto={texto} />
    </section>
  );
}
