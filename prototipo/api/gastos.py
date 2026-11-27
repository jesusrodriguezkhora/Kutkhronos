"""Pestaña Gastos de un proyecto: gasto real (carga de horas + gastos directos + indirectos) frente al
previsto en su fee estimate. En un acuerdo marco, la suma de sus contratos basados."""
import frappe
from frappe.utils import flt, getdate, today

from prototipo.gastos import ESTADOS_CON_GASTOS, ESTADOS_GASTOS_EDITABLES
from prototipo.prototipo.doctype.planificacion_semana.planificacion_semana import (
	CONCEPTO_PROYECTO,
)
from prototipo.prototipo.doctype.propuesta.propuesta import (
	PORCENTAJE_INDIRECTOS,
	POSICIONES,
)

SIN_POSICION = "Sin posición"

# Partidas del fee que son gastos directos
DIRECTOS_FEE = ("viajes", "otros_costes_directos", "subcontratacion")


def proyectos_incluidos(proyecto, tipo):
	"""El propio proyecto o, si es un acuerdo marco, sus contratos basados con gastos."""
	if tipo != "Acuerdo marco":
		return [proyecto]
	return frappe.get_all(
		"Proyecto",
		filters={"acuerdo_marco": proyecto, "estado": ["in", ESTADOS_CON_GASTOS]},
		pluck="name",
		order_by="name asc",
	)


def personal_real(proyectos):
	"""{posición: (horas, coste)} de las horas cargadas en esos proyectos, con el coste congelado."""
	filas = frappe.db.sql(
		"""select ifnull(posicion, ''), sum(horas), sum(horas * coste_hora)
		from `tabLinea Imputacion`
		where parenttype = 'Imputacion Semana' and concepto = %(concepto)s and proyecto in %(proyectos)s
		group by ifnull(posicion, '')""",
		{"concepto": CONCEPTO_PROYECTO, "proyectos": tuple(proyectos)},
	)
	return {(p or SIN_POSICION): (flt(h), flt(c, 2)) for p, h, c in filas}


def planificado_hasta_hoy(proyectos):
	"""{posición: horas} planificadas en esos proyectos en las semanas que ya han empezado.
	La planificación va por persona: cada semana cuenta en la posición que la persona tenía entonces,
	que es la que quedó congelada en su carga de horas de esa semana. Si esa semana no cargó horas, se
	usa su posición actual."""
	hoy = today()
	filas = frappe.db.sql(
		"""select a.empleado, p.semana, sum(a.horas)
		from `tabAsignacion Planificacion` a
		join `tabPlanificacion Semana` p on p.name = a.parent
		where a.parenttype = 'Planificacion Semana' and a.concepto = %(concepto)s
			and a.proyecto in %(proyectos)s and p.semana <= %(hoy)s
		group by a.empleado, p.semana""",
		{"concepto": CONCEPTO_PROYECTO, "proyectos": tuple(proyectos), "hoy": hoy},
	)
	if not filas:
		return {}

	empleados = tuple({empleado for empleado, _, _ in filas})
	# Posición congelada en la carga de horas de cada persona y semana
	congeladas = {
		(empleado, getdate(semana)): posicion
		for empleado, semana, posicion in frappe.db.sql(
			"""select i.empleado, i.semana, max(l.posicion)
			from `tabImputacion Semana` i
			join `tabLinea Imputacion` l on l.parent = i.name and l.parenttype = 'Imputacion Semana'
			where i.empleado in %(empleados)s and i.semana <= %(hoy)s and ifnull(l.posicion, '') != ''
			group by i.empleado, i.semana""",
			{"empleados": empleados, "hoy": hoy},
		)
	}
	actuales = dict(
		frappe.get_all(
			"Datos Laborales",
			filters={"usuario": ["in", empleados]},
			fields=["usuario", "posicion"],
			as_list=True,
		)
	)

	resultado = {}
	for empleado, semana, horas in filas:
		posicion = congeladas.get((empleado, getdate(semana))) or actuales.get(empleado) or SIN_POSICION
		resultado[posicion] = resultado.get(posicion, 0) + flt(horas)
	return resultado


def fees(proyectos):
	"""Fee estimates de esos proyectos (los que tengan) y sus líneas de personal."""
	propuestas = frappe.get_all(
		"Propuesta",
		filters={"proyecto": ["in", proyectos]},
		fields=["name", "proyecto", "honorarios", "coste_total", "margen_bruto", "margen_neto", *DIRECTOS_FEE],
	)
	lineas = frappe.get_all(
		"Linea Propuesta",
		filters={"parenttype": "Propuesta", "parent": ["in", [p.name for p in propuestas] or [""]]},
		fields=["categoria", "horas", "coste"],
	)
	return propuestas, lineas


def calcular_gastos(proyecto):
	"""Gasto real y previsto de un proyecto aceptado (en un acuerdo marco, la suma de sus contratos
	basados). Lo usan la pestaña Gastos y el módulo Estados; el permiso lo comprueba cada endpoint."""
	datos = frappe.db.get_value("Proyecto", proyecto, ["name", "tipo", "estado"], as_dict=True)
	if not datos:
		frappe.throw("El proyecto no existe.")
	if datos.estado not in ESTADOS_CON_GASTOS:
		frappe.throw("Los gastos solo están disponibles en proyectos aceptados.")

	es_acuerdo = datos.tipo == "Acuerdo marco"
	proyectos = proyectos_incluidos(proyecto, datos.tipo)
	propuestas, lineas_fee = fees(proyectos) if proyectos else ([], [])

	# --- Personal: una fila por posición (las del fee, en su orden) y, si hay, otras al final ---
	real = personal_real(proyectos) if proyectos else {}
	planificado = planificado_hasta_hoy(proyectos) if proyectos else {}
	previsto = {}
	for l in lineas_fee:
		h, c = previsto.get(l.categoria, (0, 0))
		previsto[l.categoria] = (h + flt(l.horas), c + flt(l.coste))

	posiciones = list(POSICIONES) + sorted(p for p in set(real) | set(previsto) | set(planificado) if p not in POSICIONES)
	filas_personal = [
		{
			"posicion": p,
			"horas": real.get(p, (0, 0))[0],
			"coste": real.get(p, (0, 0))[1],
			"horas_previstas": previsto.get(p, (0, 0))[0],
			"coste_previsto": flt(previsto.get(p, (0, 0))[1], 2),
			"horas_planificadas": flt(planificado.get(p, 0), 2),
		}
		for p in posiciones
	]
	personal = {
		"filas": filas_personal,
		"horas": sum(f["horas"] for f in filas_personal),
		"coste": flt(sum(f["coste"] for f in filas_personal), 2),
		"horas_previstas": sum(f["horas_previstas"] for f in filas_personal),
		"horas_planificadas": flt(sum(f["horas_planificadas"] for f in filas_personal), 2),
		"coste_previsto": flt(sum(f["coste_previsto"] for f in filas_personal), 2),
	}

	# --- Gastos directos: cada registro (para desplegar) y su suma ---
	gastos = (
		frappe.get_all(
			"Gasto Directo",
			filters={"proyecto": ["in", proyectos]},
			fields=["name", "proyecto", "fecha", "tipo", "concepto", "coste"],
			order_by="fecha desc, creation desc",
		)
		if proyectos
		else []
	)
	directos = {
		"gastos": gastos,
		"coste": flt(sum(flt(g.coste) for g in gastos), 2),
		"coste_previsto": flt(sum(flt(p.get(c)) for p in propuestas for c in DIRECTOS_FEE), 2),
	}

	# --- Indirectos: el 12 % de los honorarios del fee (real y previsto son el mismo) ---
	honorarios = sum(flt(p.honorarios) for p in propuestas)
	indirectos = flt(honorarios * PORCENTAJE_INDIRECTOS / 100, 2)

	# --- Total y comparación con el fee ---
	total_real = flt(personal["coste"] + directos["coste"] + indirectos, 2)
	total_previsto = flt(sum(flt(p.coste_total) for p in propuestas), 2)
	diferencia = flt(total_real - total_previsto, 2)

	return {
		"proyecto": proyecto,
		"acuerdo_marco": es_acuerdo,
		# Contratos basados incluidos (solo en un acuerdo marco)
		"basados": proyectos if es_acuerdo else [],
		# Proyectos sin fee estimate: su previsto no cuenta
		"sin_fee": sorted(set(proyectos) - {p.proyecto for p in propuestas}),
		# Para cuando Administración pueda registrar gastos directos
		"editable": datos.estado in ESTADOS_GASTOS_EDITABLES and not es_acuerdo,
		"personal": personal,
		"directos": directos,
		"indirectos": {"coste": indirectos, "porcentaje": PORCENTAJE_INDIRECTOS},
		"total": {
			"real": total_real,
			"previsto": total_previsto,
			"diferencia": diferencia,
			"porcentaje": flt(diferencia / total_previsto * 100, 1) if total_previsto else None,
			"supera": bool(total_previsto) and total_real > total_previsto + 0.005,
		},
		# Para el módulo Estados: ingresos (honorarios del fee) y márgenes previstos en el fee
		"honorarios": flt(honorarios, 2),
		"fee_margen_bruto": flt(sum(flt(p.margen_bruto) for p in propuestas), 2),
		"fee_margen_neto": flt(sum(flt(p.margen_neto) for p in propuestas), 2),
	}
