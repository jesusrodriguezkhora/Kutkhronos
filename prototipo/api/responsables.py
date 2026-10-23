import frappe

from prototipo.roles import (
	ROL_CEO,
	ROL_COORDINADOR,
	ROLES_GESTION,
	exigir_rol,
)

# Cuentas que pueden ser responsables de un proyecto
ROLES_RESPONSABLE = (ROL_COORDINADOR, ROL_CEO)


def responsables_posibles():
	"""Cuentas activas con algún rol de ROLES_RESPONSABLE (los roles están en la tabla hija Has Role)."""
	usuarios = frappe.get_all(
		"Has Role",
		filters={"role": ["in", ROLES_RESPONSABLE], "parenttype": "User"},
		pluck="parent",
		distinct=True,
	)
	if not usuarios:
		return []
	return frappe.get_all(
		"User",
		filters={"name": ["in", usuarios], "enabled": 1},
		fields=["name", "full_name"],
		order_by="full_name asc",
	)


@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def buscar_responsables(doctype, txt, searchfield, start, page_len, filters):
	"""Búsqueda del campo responsable en el formulario del Desk: devuelve (usuario, nombre)."""
	texto = (txt or "").lower()
	encontrados = [
		(u.name, u.full_name)
		for u in responsables_posibles()
		if texto in (u.full_name or "").lower() or texto in u.name.lower()
	]
	return encontrados[start : start + page_len]


@frappe.whitelist()
def listar_responsables():
	"""Empleados y coordinadores activos, para el selector de responsable de la SPA."""
	exigir_rol(*ROLES_GESTION)
	return responsables_posibles()