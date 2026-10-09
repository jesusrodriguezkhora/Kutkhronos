import frappe

ROL_EMPLEADO = "Empleado"
ROL_COORDINADOR = "Coordinador"
ROL_CEO = "CEO"

ROLES_APP = (ROL_EMPLEADO, ROL_COORDINADOR, ROL_CEO)

# Roles que gestionan proyectos y empleados
ROLES_GESTION = (ROL_COORDINADOR, ROL_CEO)


def tiene_rol(*roles):
	"""True si el usuario de la sesión tiene alguno de los roles indicados."""
	return bool(set(roles) & set(frappe.get_roles()))


def exigir_rol(*roles):
	"""Detiene la petición con un error de permisos si el usuario no tiene ninguno de los roles."""
	if not tiene_rol(*roles):
		frappe.throw("No tienes permiso para realizar esta acción.", frappe.PermissionError)