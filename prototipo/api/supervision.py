"""Supervisión de la planificación: horas reales (carga de horas) frente a planificadas, por semana."""
import frappe
from frappe.utils import flt, get_fullname

from prototipo.api.planificacion import comprobar_lunes, datos_proyectos, etiqueta
from prototipo.imputacion.reglas import esta_cerrada
from prototipo.prototipo.doctype.planificacion_semana.planificacion_semana import (
	CONCEPTO_PROYECTO,
	CONCEPTO_VACACIONES,
	CONCEPTOS_SEMANALES,
)
from prototipo.roles import (
	ROL_ADMINISTRACION,
	ROL_CEO,
	ROLES_GESTION,
	exigir_rol,
	tiene_rol,
)

# Roles que ven toda la empresa (y la fila de totales). El resto de gestión ve solo sus proyectos.
ROLES_VISTA_COMPLETA = (ROL_CEO, ROL_ADMINISTRACION)


def fila_de(concepto, proyecto):
	"""Clave de fila: el código del proyecto o el nombre del concepto (Formación, Comercial, Interno)."""
	return proyecto if concepto == CONCEPTO_PROYECTO else concepto


def horas_planificadas(lunes):
	"""{(fila, empleado): horas} planificadas en la semana, sin vacaciones."""
	plan = frappe.db.get_value("Planificacion Semana", {"semana": lunes})
	if not plan:
		return {}
	horas = {}
	for a in frappe.get_all(
		"Asignacion Planificacion",
		filters={"parenttype": "Planificacion Semana", "parent": plan, "concepto": ["!=", CONCEPTO_VACACIONES]},
		fields=["concepto", "proyecto", "empleado", "horas"],
	):
		k = (fila_de(a.concepto, a.proyecto), a.empleado)
		horas[k] = horas.get(k, 0) + flt(a.horas)
	return horas


def horas_reales(lunes):
	"""{(fila, empleado): horas} imputadas en la semana, sumando los días de cada persona."""
	filas = frappe.db.sql(
		"""select l.concepto, l.proyecto, i.empleado, sum(l.horas)
		from `tabLinea Imputacion` l
		join `tabImputacion Semana` i on i.name = l.parent
		where l.parenttype = 'Imputacion Semana' and i.semana = %s
		group by l.concepto, l.proyecto, i.empleado""",
		(lunes,),
	)
	return {(fila_de(c, p), e): flt(h) for c, p, e, h in filas}


@frappe.whitelist()
def supervision_semana(lunes):
	"""Horas reales y planificadas de una semana, por fila y persona. Para los roles de gestión:
	CEO y Administración ven toda la empresa; el resto, los proyectos de los que son responsables."""
	exigir_rol(*ROLES_GESTION)
	lunes = comprobar_lunes(lunes)
	planificado = horas_planificadas(lunes)
	real = horas_reales(lunes)
	completa = tiene_rol(*ROLES_VISTA_COMPLETA)

	if completa:
		# Proyectos y conceptos con horas planificadas o reales esta semana
		con_horas = {f for f, _ in set(planificado) | set(real)}
		proyectos = con_horas - set(CONCEPTOS_SEMANALES)
		conceptos = [c for c in CONCEPTOS_SEMANALES if c in con_horas]
	else:
		# Sus proyectos (responsable en el Pipeline) con horas planificadas esta semana
		propios = set(frappe.get_all("Proyecto", filters={"responsable": frappe.session.user}, pluck="name"))
		proyectos = {f for f, _ in planificado if f in propios}
		conceptos = []

	filas = proyectos | set(conceptos)
	celdas = [
		{"fila": f, "empleado": e, "real": real.get((f, e), 0), "planificado": planificado.get((f, e), 0)}
		for f, e in sorted(set(planificado) | set(real))
		if f in filas
	]

	# Columnas: quien tenga horas (planificadas o reales) en alguna de esas filas, por nombre
	empleados = sorted(
		({"usuario": u, "nombre": get_fullname(u)} for u in {c["empleado"] for c in celdas}),
		key=lambda e: e["nombre"].lower(),
	)

	return {
		"semana": {"lunes": lunes, "etiqueta": etiqueta(lunes), "terminada": esta_cerrada(lunes)},
		"vista_completa": completa,
		"filas": datos_proyectos(sorted(proyectos)),
		"conceptos": conceptos,
		"empleados": empleados,
		"celdas": celdas,
	}