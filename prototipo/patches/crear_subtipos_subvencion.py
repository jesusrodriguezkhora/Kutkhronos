import frappe

# Subtipos de subvención de partida. Los siguientes los añade un administrador desde el Desk.
SUBTIPOS_INICIALES = ("EUI", "Horizon")


def execute():
	for subtipo in SUBTIPOS_INICIALES:
		if not frappe.db.exists("Subtipo Subvencion", subtipo):
			frappe.get_doc({"doctype": "Subtipo Subvencion", "subtipo": subtipo}).insert(ignore_permissions=True)