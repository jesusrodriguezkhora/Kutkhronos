import frappe
from frappe.utils import cint, flt, get_fullname

from prototipo.prototipo.doctype.propuesta.propuesta import (
	IMPORTES,
	MARGEN_BRUTO_OBJETIVO,
	MARGEN_NETO_OBJETIVO,
	PORCENTAJE_INDIRECTOS,
	POSICIONES,
	coste_hora_medio,
)
from prototipo.roles import ROLES_GESTION, exigir_rol

# Campos que calcula el controlador al guardar
RESULTADOS = (
	"coste_personal",
	"gastos_indirectos",
	"coste_total",
	"margen_bruto",
	"margen_bruto_pct",
	"margen_neto",
	"margen_neto_pct",
)


def comprobar_proyecto(proyecto):
	if not proyecto or not frappe.db.exists("Proyecto", proyecto):
		frappe.throw("El proyecto no existe.")


@frappe.whitelist()
def obtener_propuesta(proyecto):
	"""Propuesta de un proyecto (None si aún no tiene) y los datos para calcularla en vivo al editar.
	Solo para los roles de gestión."""
	exigir_rol(*ROLES_GESTION)
	comprobar_proyecto(proyecto)

	respuesta = {
		"posiciones": POSICIONES,
		"coste_hora_actual": {p: flt(c, 2) for p, c in coste_hora_medio().items()},
		"porcentaje_indirectos": PORCENTAJE_INDIRECTOS,
		"margen_bruto_objetivo": MARGEN_BRUTO_OBJETIVO,
		"margen_neto_objetivo": MARGEN_NETO_OBJETIVO,
		"propuesta": None,
	}

	if frappe.db.exists("Propuesta", proyecto):
		doc = frappe.get_doc("Propuesta", proyecto)
		respuesta["propuesta"] = {
			**{campo: flt(doc.get(campo)) for campo in (*IMPORTES, *RESULTADOS)},
			"lineas": [
				{"categoria": l.categoria, "horas": l.horas, "coste_hora": l.coste_hora, "coste": l.coste}
				for l in doc.lineas
			],
			"modificado": doc.modified,
			"modificado_por": get_fullname(doc.modified_by),
		}

	return respuesta


@frappe.whitelist(methods=["POST"])
def guardar_propuesta(proyecto, datos):
	"""Crea o actualiza la propuesta de un proyecto. Solo para los roles de gestión.
	datos = {"honorarios", "viajes", "otros_costes_directos", "subcontratacion", "horas": {posición: horas}}
	Los costes y los márgenes los calcula el controlador de Propuesta."""
	exigir_rol(*ROLES_GESTION)
	comprobar_proyecto(proyecto)
	datos = frappe.parse_json(datos) or {}

	if frappe.db.exists("Propuesta", proyecto):
		doc = frappe.get_doc("Propuesta", proyecto)
	else:
		doc = frappe.new_doc("Propuesta")
		doc.proyecto = proyecto

	for campo in IMPORTES:
		doc.set(campo, flt(datos.get(campo)))

	horas = datos.get("horas") or {}
	doc.set("lineas", [{"categoria": p, "horas": cint(horas.get(p))} for p in POSICIONES])

	doc.save(ignore_permissions=True)
	return obtener_propuesta(proyecto)