import frappe

ROL_EMPLEADO = "Empleado"
ROL_COORDINADOR = "Coordinador"
ROL_CEO = "CEO"
ROL_ADMINISTRACION = "Administracion"

ROLES_APP = (ROL_EMPLEADO, ROL_COORDINADOR, ROL_CEO, ROL_ADMINISTRACION)

# Roles que gestionan proyectos y empleados
ROLES_GESTION = (ROL_COORDINADOR, ROL_CEO, ROL_ADMINISTRACION)

# Roles de dirección: sus cuentas solo las pueden modificar o borrar otros usuarios de dirección.
# System Manager es el rol de administrador de Frappe (el usuario Administrator siempre lo tiene).
ROLES_DIRECCION = (ROL_CEO, ROL_ADMINISTRACION, "System Manager")


def tiene_rol(*roles):
	"""True si el usuario de la sesión tiene alguno de los roles indicados."""
	return bool(set(roles) & set(frappe.get_roles()))


def exigir_rol(*roles):
	"""Detiene la petición con un error de permisos si el usuario no tiene ninguno de los roles."""
	if not tiene_rol(*roles):
		frappe.throw("No tienes permiso para realizar esta acción.", frappe.PermissionError)
