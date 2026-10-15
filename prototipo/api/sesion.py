import frappe
from frappe.utils import get_fullname

from prototipo.roles import ROL_EMPLEADO, ROLES_APP, ROLES_GESTION, es_administrador, tiene_rol


@frappe.whitelist()
def mi_perfil():
	"""Datos del usuario de la sesión y los módulos de la SPA a los que tiene acceso."""
	modulos = []
	if tiene_rol(*ROLES_GESTION):
		modulos += ["proyectos", "empleados"]

	return {
		"usuario": frappe.session.user,
		"nombre": get_fullname(frappe.session.user),
		"roles": [r for r in frappe.get_roles() if r in ROLES_APP],
		"modulos": modulos,
		"imputa_horas": tiene_rol(ROL_EMPLEADO),
		"es_administrador": es_administrador(),
	}