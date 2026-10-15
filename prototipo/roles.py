import frappe

ROL_EMPLEADO = "Empleado"
ROL_COORDINADOR = "Coordinador"
ROL_CEO = "CEO"

ROLES_APP = (ROL_EMPLEADO, ROL_COORDINADOR, ROL_CEO)

# Roles que gestionan proyectos y empleados
ROLES_GESTION = (ROL_COORDINADOR, ROL_CEO)

# Rol de administrador de Frappe (el usuario Administrator siempre lo tiene)
ROL_ADMINISTRADOR = "System Manager"


def tiene_rol(*roles):
	"""True si el usuario de la sesión tiene alguno de los roles indicados."""
	return bool(set(roles) & set(frappe.get_roles()))


def exigir_rol(*roles):
	"""Detiene la petición con un error de permisos si el usuario no tiene ninguno de los roles."""
	if not tiene_rol(*roles):
		frappe.throw("No tienes permiso para realizar esta acción.", frappe.PermissionError)


def es_administrador():
	"""True si el usuario de la sesión es administrador del sistema."""
	return frappe.session.user == "Administrator" or tiene_rol(ROL_ADMINISTRADOR)


def exigir_administrador():
	"""Detiene la petición con un error de permisos si el usuario no es administrador."""
	if not es_administrador():
		frappe.throw("No tienes permiso para realizar esta acción.", frappe.PermissionError)
