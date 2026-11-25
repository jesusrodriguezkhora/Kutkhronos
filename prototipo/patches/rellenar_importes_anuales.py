import frappe

from prototipo.prototipo.doctype.proyecto.proyecto import (
	anios_del_proyecto,
	repartir_importe,
)


def execute():
	"""Reparto por defecto del importe por año en los proyectos con fechas de inicio y fin que aún no
	lo tienen. Se insertan las filas directamente, sin volver a validar el proyecto entero."""
	con_filas = set(frappe.get_all("Importe Anual", filters={"parenttype": "Proyecto"}, pluck="parent", distinct=True))
	for p in frappe.get_all("Proyecto", fields=["name", "importe", "fecha_inicio", "fecha_fin"]):
		anios = anios_del_proyecto(p.fecha_inicio, p.fecha_fin)
		if p.name in con_filas or not anios:
			continue
		doc = frappe.get_doc("Proyecto", p.name)
		for anio, importe in repartir_importe(p.importe, anios):
			doc.append("importes_anuales", {"anio": anio, "importe": importe}).db_insert()