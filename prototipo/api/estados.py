"""Módulo Estados: buscador de proyectos aceptados y estado de cada uno (gastos reales, márgenes frente
al fee y evolución mes a mes). Para los mismos roles que veían la pestaña Gastos."""
import frappe
from frappe.utils import flt, get_fullname

from prototipo.api.gastos import calcular_gastos
from prototipo.gastos import ESTADOS_CON_GASTOS
from prototipo.prototipo.doctype.planificacion_semana.planificacion_semana import (
	CONCEPTO_PROYECTO,
)
from prototipo.prototipo.doctype.propuesta.propuesta import (
	MARGEN_BRUTO_OBJETIVO,
	MARGEN_NETO_OBJETIVO,
)
from prototipo.roles import ROLES_GESTION, exigir_rol


def porcentaje(valor, base):
	return flt(valor / base * 100, 1) if base else None


def margenes(ingresos, bruto, neto):
	"""Margen bruto y neto en € y en % sobre los ingresos."""
	return {
		"bruto": flt(bruto, 2),
		"neto": flt(neto, 2),
		"bruto_pct": porcentaje(bruto, ingresos),
		"neto_pct": porcentaje(neto, ingresos),
	}


def siguiente_mes(mes):
	"""'2026-12' -> '2027-01'"""
	anio, m = map(int, mes.split("-"))
	return f"{anio + m // 12:04d}-{m % 12 + 1:02d}"


def evolucion_mensual(proyectos):
	"""[{mes: 'AAAA-MM', horas, personal, directos, gasto}], del primer mes con actividad al último, con
	los meses intermedios sin actividad a 0. Gasto = personal (horas × coste congelado) + directos."""
	if not proyectos:
		return []
	por_mes = {}

	def mes_de(mes):
		return por_mes.setdefault(mes, {"horas": 0, "personal": 0, "directos": 0})

	for mes, horas, coste in frappe.db.sql(
		"""select date_format(fecha, '%%Y-%%m'), sum(horas), sum(horas * coste_hora)
		from `tabLinea Imputacion`
		where parenttype = 'Imputacion Semana' and concepto = %(concepto)s and proyecto in %(proyectos)s
		group by 1""",
		{"concepto": CONCEPTO_PROYECTO, "proyectos": tuple(proyectos)},
	):
		mes_de(mes).update(horas=flt(horas), personal=flt(coste, 2))

	for mes, coste in frappe.db.sql(
		"""select date_format(fecha, '%%Y-%%m'), sum(coste)
		from `tabGasto Directo` where proyecto in %(proyectos)s group by 1""",
		{"proyectos": tuple(proyectos)},
	):
		mes_de(mes)["directos"] = flt(coste, 2)

	if not por_mes:
		return []
	resultado, mes, ultimo = [], min(por_mes), max(por_mes)
	while mes <= ultimo:
		valores = por_mes.get(mes, {"horas": 0, "personal": 0, "directos": 0})
		resultado.append({"mes": mes, **valores, "gasto": flt(valores["personal"] + valores["directos"], 2)})
		mes = siguiente_mes(mes)
	return resultado


@frappe.whitelist()
def buscar_proyectos(texto=None):
	"""Proyectos aceptados cuyo código, descripción o cliente contienen el texto (máximo 20).
	Sin texto, los últimos modificados."""
	exigir_rol(*ROLES_GESTION)
	texto = (texto or "").strip()
	o_filtros = None
	if texto:
		patron = f"%{texto}%"
		o_filtros = [["name", "like", patron], ["descripcion", "like", patron], ["cliente", "like", patron]]
	return frappe.get_all(
		"Proyecto",
		filters={"estado": ["in", ESTADOS_CON_GASTOS]},
		or_filters=o_filtros,
		fields=["name", "descripcion", "cliente", "tipo", "acuerdo_marco"],
		order_by="modified desc",
		limit_page_length=20,
	)


@frappe.whitelist()
def obtener_estado(proyecto):
	"""Estado de un proyecto aceptado: cabecera, gastos (la misma tabla que la antigua pestaña Gastos),
	márgenes real y previsto frente al objetivo, y evolución mes a mes."""
	exigir_rol(*ROLES_GESTION)
	gastos = calcular_gastos(proyecto)  # también comprueba que existe y que está aceptado

	cabecera = frappe.db.get_value(
		"Proyecto",
		proyecto,
		["name", "descripcion", "cliente", "tipo", "estado", "responsable", "fecha_inicio", "fecha_fin", "importe"],
		as_dict=True,
	)
	cabecera["responsable_nombre"] = get_fullname(cabecera.responsable) if cabecera.responsable else None

	ingresos = gastos["honorarios"]
	real_bruto = ingresos - gastos["personal"]["coste"] - gastos["directos"]["coste"]
	real_neto = real_bruto - gastos["indirectos"]["coste"]

	proyectos = gastos["basados"] if gastos["acuerdo_marco"] else [proyecto]
	return {
		"proyecto": cabecera,
		"gastos": gastos,
		"margenes": {
			"ingresos": ingresos,
			# Sin fee no hay ingresos con los que calcular márgenes
			"real": margenes(ingresos, real_bruto, real_neto) if ingresos else None,
			"previsto": margenes(ingresos, gastos["fee_margen_bruto"], gastos["fee_margen_neto"]) if ingresos else None,
			"objetivo": {"bruto_pct": MARGEN_BRUTO_OBJETIVO, "neto_pct": MARGEN_NETO_OBJETIVO},
		},
		"mensual": evolucion_mensual(proyectos),
	}