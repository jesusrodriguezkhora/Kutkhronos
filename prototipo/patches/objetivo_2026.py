import frappe


def execute():
	"""Budget goal inicial: 1.450.000 € en 2026."""
	if not frappe.db.exists("Objetivo Anual", "2026"):
		frappe.get_doc({"doctype": "Objetivo Anual", "anio": 2026, "importe": 1450000}).insert(
			ignore_permissions=True
		)
