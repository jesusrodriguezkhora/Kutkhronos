import frappe

ROL_EMPLEADO = "Empleado"
ROL_COORDINADOR = "Coordinador"
ROL_CEO = "CEO"
ROL_ADMINISTRACION = "Administracion"

ROLES_APP = (ROL_EMPLEADO, ROL_COORDINADOR, ROL_CEO, ROL_ADMINISTRACION)

# Roles que gestionan proyectos, clientes y empleados
ROLES_GESTION = (ROL_COORDINADOR, ROL_CEO, ROL_ADMINISTRACION)

# Roles de dirección: sus cuentas solo las pueden modificar o borrar otros usuarios de dirección.
# System Manager es el rol de administrador de Frappe (el usuario Administrator siempre lo tiene).
ROLES_DIRECCION = (ROL_CEO, ROL_ADMINISTRACION, "System Manager")

# Rol que se elige en la SPA → roles de Frappe que recibe la cuenta.
# Los coordinadores también son empleados (imputan horas).
ROLES_ASIGNABLES = {
	ROL_EMPLEADO: [ROL_EMPLEADO],
	ROL_COORDINADOR: [ROL_EMPLEADO, ROL_COORDINADOR],
	ROL_CEO: [ROL_CEO],
	ROL_ADMINISTRACION: [ROL_ADMINISTRACION],
}

# De mayor a menor: el rol que se muestra de una cuenta es el primero de esta lista que tenga
ORDEN_ROLES = (ROL_ADMINISTRACION, ROL_CEO, ROL_COORDINADOR, ROL_EMPLEADO)


def tiene_rol(*roles):
	"""True si el usuario de la sesión tiene alguno de los roles indicados."""
	return bool(set(roles) & set(frappe.get_roles()))


def exigir_rol(*roles):
	"""Detiene la petición con un error de permisos si el usuario no tiene ninguno de los roles."""
	if not tiene_rol(*roles):
		frappe.throw("No tienes permiso para realizar esta acción.", frappe.PermissionError)


def rol_principal(roles):
	"""El rol de la aplicación más alto de una colección de roles, o None si no tiene ninguno."""
	return next((r for r in ORDEN_ROLES if r in roles), None)


def roles_asignables():
	"""Roles que el usuario de la sesión puede dar a otras cuentas. Los de dirección, solo dirección."""
	if tiene_rol(*ROLES_DIRECCION):
		return list(ORDEN_ROLES[::-1])
	return [ROL_EMPLEADO, ROL_COORDINADOR]
