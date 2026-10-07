import { useFrappeGetDocList } from "frappe-react-sdk";

const coloresEstado = {
  Abierto: "bg-sky-500/20 text-sky-300",
  "En curso": "bg-amber-500/20 text-amber-300",
  Cerrado: "bg-emerald-500/20 text-emerald-300",
};

export default function Proyectos() {
  const { data, error, isLoading } = useFrappeGetDocList("Proyecto", {
    fields: ["name", "nombre", "cliente", "estado", "fecha_inicio"],
    orderBy: { field: "creation", order: "desc" },
    limit: 50,
  });

  if (isLoading) {
    return <p className="text-slate-400">Cargando proyectos…</p>;
  }

  if (error) {
    return (
      <p className="text-red-400">
        Error al cargar proyectos: {error.message}
      </p>
    );
  }

  if (!data || data.length === 0) {
    return <p className="text-slate-400">No hay proyectos todavía.</p>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {data.map((p) => (
        <div
          key={p.name}
          className="rounded-xl border border-white/10 bg-white/5 p-5"
        >
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-lg font-semibold">{p.nombre}</h2>
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                coloresEstado[p.estado] || "bg-white/10"
              }`}
            >
              {p.estado || "Sin estado"}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-400">
            Cliente: {p.cliente || "—"}
          </p>
          <p className="text-sm text-slate-400">
            Inicio: {p.fecha_inicio || "—"}
          </p>
        </div>
      ))}
    </div>
  );
}