import frappe


def execute():
	"""Estados y tipos nuevos del proyecto:
	- "En curso" pasa a "Aceptado" (el estado desaparece; "Cerrado" se mantiene).
	- "Contrato" se reparte por su vía: "Contrato menor" -> Contrato menor; el resto (licitación
	  pública, contratación directa, sin vía) -> Licitación.
	La columna `via` sigue en la tabla aunque el campo ya no esté en el DocType: se lee con SQL."""
	frappe.db.sql("update `tabProyecto` set estado = 'Aceptado' where estado = 'En curso'")

	if not frappe.db.has_column("Proyecto", "via"):
		frappe.db.sql("update `tabProyecto` set tipo = 'Licitación' where tipo = 'Contrato'")
		return
	frappe.db.sql(
		"""update `tabProyecto` set tipo = if(via = 'Contrato menor', 'Contrato menor', 'Licitación')
		where tipo = 'Contrato'"""
	)
