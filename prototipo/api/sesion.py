import frappe
from frappe.utils import get_fullname

from prototipo.roles import (
	ROL_EMPLEADO,
	ROLES_APP,
	ROLES_DATOS_LABORALES,
	ROLES_GESTION,
	roles_asignables,
	tiene_rol,
)


@frappe.whitelist()
def mi_perfil():
	"""Datos del usuario de la sesión y los módulos de la SPA a los que tiene acceso."""
	es_gestion = tiene_rol(*ROLES_GESTION)
	modulos = []
	if es_gestion:
		# El orden del menú y la página de entrada los decide MODULOS en la SPA
		modulos += ["panel", "proyectos", "planificacion", "clientes", "empleados"]
	if tiene_rol(ROL_EMPLEADO):
		# Empleados y coordinadores imputan sus horas
		modulos.append("imputacion")

	return {
		"usuario": frappe.session.user,
		"nombre": get_fullname(frappe.session.user),
		"roles": [r for r in frappe.get_roles() if r in ROLES_APP],
		"modulos": modulos,
		"imputa_horas": tiene_rol(ROL_EMPLEADO),
		# Roles que puede dar al crear o editar cuentas en la página Empleados
		"roles_asignables": roles_asignables() if es_gestion else [],
		# Si ve y edita posición, salario, horas y coste por hora en la página Empleados
		"ve_datos_laborales": es_gestion and tiene_rol(*ROLES_DATOS_LABORALES),
	}