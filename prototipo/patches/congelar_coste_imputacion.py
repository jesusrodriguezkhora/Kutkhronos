import frappe
from frappe.utils import flt

from prototipo.prototipo.doctype.propuesta.propuesta import coste_hora_medio


def execute():
	"""Horas cargadas antes de congelar el coste: se les pone la posición actual de la persona y el
	coste/hora medio de hoy de esa posición (no hay forma de saber los de entonces)."""
	medias = coste_hora_medio()
	posiciones = dict(frappe.get_all("Datos Laborales", fields=["usuario", "posicion"], as_list=True))

	for linea in frappe.db.sql(
		"""select l.name, i.empleado from `tabLinea Imputacion` l
		join `tabImputacion Semana` i on i.name = l.parent
		where l.parenttype = 'Imputacion Semana' and ifnull(l.posicion, '') = ''""",
		as_dict=True,
	):
		posicion = posiciones.get(linea.empleado)
		frappe.db.set_value(
			"Linea Imputacion",
			linea.name,
			{"posicion": posicion, "coste_hora": flt(medias.get(posicion), 2) if posicion else 0},
			update_modified=False,
		)