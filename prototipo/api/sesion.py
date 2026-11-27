import frappe
from frappe.utils import get_fullname

from prototipo.roles import (
	ROL_EMPLEADO,
	ROLES_APP,
	ROLES_DATOS_LABORALES,
	ROLES_GESTION,
	dashboard_del_usuario,
	roles_asignables,
	tiene_rol,
)


@frappe.whitelist()
def mi_perfil():
	"""Datos del usuario de la sesión y los módulos de la SPA a los que tiene acceso."""
	es_gestion = tiene_rol(*ROLES_GESTION)
	imputa_horas = tiene_rol(ROL_EMPLEADO)

	roles = [r for r in frappe.get_roles() if r in ROLES_APP]

	# El orden del menú y la página de entrada los decide NAVEGACION en la SPA (src/navegacion.jsx)
	modulos = []
	if roles:
		# Todos los perfiles tienen dashboard; cuál ve cada uno lo indica "dashboard"
		modulos.append("dashboard")
	if es_gestion:
		modulos += [
			"proyectos",  # Proyectos > Pipeline
			"estado_proyectos",  # Proyectos > Estado
			"empleados",  # Recursos > Empleados
			"clientes",  # Recursos > Clientes
			"historico",  # Facturación > Histórico
			"facturas",  # Facturación > Facturas
			"planificacion",  # Planificación > Planificación de horas
		]
	if imputa_horas or es_gestion:
		# Carga: empleados y coordinadores imputan sus horas; la gestión entra también para supervisar
		modulos.append("imputacion")

	return {
		"usuario": frappe.session.user,
		"nombre": get_fullname(frappe.session.user),
		"roles": roles,
		"modulos": modulos,
		# Dashboard que ve: "ceo", "administracion", "coordinacion" o "general" (ver roles.DASHBOARDS_POR_ROL)
		"dashboard": dashboard_del_usuario(roles),
		# Si tiene tabla de carga de horas propia (CEO y Administración no cargan horas)
		"imputa_horas": imputa_horas,
		# Si ve el botón Supervisión en Carga (mismos roles que prototipo.api.supervision)
		"supervisa": es_gestion,
		# Roles que puede dar al crear o editar cuentas en la página Empleados
		"roles_asignables": roles_asignables() if es_gestion else [],
		# Si ve y edita posición, salario, horas y coste por hora en la página Empleados
		"ve_datos_laborales": es_gestion and tiene_rol(*ROLES_DATOS_LABORALES),
	}