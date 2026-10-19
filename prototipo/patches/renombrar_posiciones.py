import frappe

# Posición antigua -> nueva
CAMBIOS = {
	"CEO": "Director",
	"Consultor Junior": "Consultor",
}


def execute():
	"""Las posiciones de Datos Laborales pasan a coincidir con las categorías de la propuesta."""
	for antigua, nueva in CAMBIOS.items():
		frappe.db.sql(
			"update `tabDatos Laborales` set posicion = %s where posicion = %s",
			(nueva, antigua),
		)