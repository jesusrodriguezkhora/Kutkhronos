import frappe

from prototipo.roles import ROL_COORDINADOR, exigir_rol

# Campos de cada proyecto que recibe el dashboard de coordinación. Por ahora la SPA solo muestra el
# código y la descripción; el resto queda disponible para el contenido futuro de cada desplegable.
CAMPOS_PROYECTO = ["name", "descripcion", "estado", "tipo", "cliente", "acuerdo_marco"]


@frappe.whitelist()
def obtener_dashboard_coordinacion():
	"""Datos del dashboard de coordinación: los proyectos de los que el usuario de la sesión es
	responsable y sus KPIs.

	`kpis` es un diccionario {clave: valor}: para añadir un KPI basta con calcularlo aquí y declararlo
	en la lista KPIS de la SPA (dashboard/src/dashboard/DashboardCoordinacion.jsx)."""
	exigir_rol(ROL_COORDINADOR)

	proyectos = frappe.get_list(
		"Proyecto",
		filters={"responsable": frappe.session.user},
		fields=CAMPOS_PROYECTO,
		order_by="creation desc",
		limit_page_length=0,
	)

	return {
		"kpis": {
			"proyectos_asignados": len(proyectos),
		},
		"proyectos": proyectos,
	}
