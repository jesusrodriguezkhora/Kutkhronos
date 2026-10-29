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
	imputa_horas = tiene_rol(ROL_EMPLEADO)

	modulos = []
	if es_gestion:
		# El orden del menú y la página de entrada los decide MODULOS en la SPA
		modulos += ["panel", "proyectos", "planificacion", "clientes", "empleados"]
	if imputa_horas or es_gestion:
		# Carga: empleados y coordinadores imputan sus horas; la gestión entra también para supervisar
		modulos.append("imputacion")

	return {
		"usuario": frappe.session.user,
		"nombre": get_fullname(frappe.session.user),
		"roles": [r for r in frappe.get_roles() if r in ROLES_APP],
		"modulos": modulos,
		# Si tiene tabla de carga de horas propia (CEO y Administración no cargan horas)
		"imputa_horas": imputa_horas,
		# Si ve el botón Supervisión en Carga (mismos roles que prototipo.api.supervision)
		"supervisa": es_gestion,
		# Roles que puede dar al crear o editar cuentas en la página Empleados
		"roles_asignables": roles_asignables() if es_gestion else [],
		# Si ve y edita posición, salario, horas y coste por hora en la página Empleados
		"ve_datos_laborales": es_gestion and tiene_rol(*ROLES_DATOS_LABORALES),
	}