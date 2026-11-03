"""Pestaña Gastos de un proyecto: gasto real (carga de horas + gastos directos + indirectos) frente al
previsto en su fee estimate. En un acuerdo marco, la suma de sus contratos basados."""
import frappe
from frappe.utils import flt

from prototipo.gastos import ESTADOS_CON_GASTOS, ESTADOS_GASTOS_EDITABLES
from prototipo.prototipo.doctype.planificacion_semana.planificacion_semana import (
	CONCEPTO_PROYECTO,
)
from prototipo.prototipo.doctype.propuesta.propuesta import (
	PORCENTAJE_INDIRECTOS,
	POSICIONES,
)
from prototipo.roles import ROLES_GESTION, exigir_rol

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


def fees(proyectos):
	"""Fee estimates de esos proyectos (los que tengan) y sus líneas de personal."""
	propuestas = frappe.get_all(
		"Propuesta",
		filters={"proyecto": ["in", proyectos]},
		fields=["name", "proyecto", "honorarios", "coste_total", *DIRECTOS_FEE],
	)
	lineas = frappe.get_all(
		"Linea Propuesta",
		filters={"parenttype": "Propuesta", "parent": ["in", [p.name for p in propuestas] or [""]]},
		fields=["categoria", "horas", "coste"],
	)
	return propuestas, lineas


@frappe.whitelist()
def obtener_gastos(proyecto):
	"""Gasto real y previsto de un proyecto aceptado, en curso o cerrado. Solo para los roles de gestión."""
	exigir_rol(*ROLES_GESTION)
	datos = frappe.db.get_value("Proyecto", proyecto, ["name", "tipo", "estado"], as_dict=True)
	if not datos:
		frappe.throw("El proyecto no existe.")
	if datos.estado not in ESTADOS_CON_GASTOS:
		frappe.throw("Los gastos solo están disponibles en proyectos aceptados, en curso o cerrados.")

	es_acuerdo = datos.tipo == "Acuerdo marco"
	proyectos = proyectos_incluidos(proyecto, datos.tipo)
	propuestas, lineas_fee = fees(proyectos) if proyectos else ([], [])

	# --- Personal: una fila por posición (las del fee, en su orden) y, si hay, otras al final ---
	real = personal_real(proyectos) if proyectos else {}
	previsto = {}
	for l in lineas_fee:
		h, c = previsto.get(l.categoria, (0, 0))
		previsto[l.categoria] = (h + flt(l.horas), c + flt(l.coste))

	posiciones = list(POSICIONES) + sorted(p for p in set(real) | set(previsto) if p not in POSICIONES)
	filas_personal = [
		{
			"posicion": p,
			"horas": real.get(p, (0, 0))[0],
			"coste": real.get(p, (0, 0))[1],
			"horas_previstas": previsto.get(p, (0, 0))[0],
			"coste_previsto": flt(previsto.get(p, (0, 0))[1], 2),
		}
		for p in posiciones
	]
	personal = {
		"filas": filas_personal,
		"horas": sum(f["horas"] for f in filas_personal),
		"coste": flt(sum(f["coste"] for f in filas_personal), 2),
		"horas_previstas": sum(f["horas_previstas"] for f in filas_personal),
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
		# Para cuando Administración pueda registrar gastos directos (cerrado: solo lectura)
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
	}