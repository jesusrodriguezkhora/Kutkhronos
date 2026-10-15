from frappe.model.utils.rename_field import rename_field


def execute():
	"""Proyecto: el campo observaciones pasa a llamarse descripcion. Copia los textos existentes a la
	columna nueva (migrate crea la columna nueva pero no mueve los datos de la antigua)."""
	rename_field("Proyecto", "observaciones", "descripcion")
