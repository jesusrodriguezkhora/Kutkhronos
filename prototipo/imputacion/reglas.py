"""Reglas de la imputación de horas: lo que comparten el controlador de Imputacion Semana y la API."""
from datetime import timedelta

import frappe
from frappe.utils import flt, getdate, today

from prototipo.planificacion.semanas import dias_de_semana, festivos_de_semana
from prototipo.prototipo.doctype.planificacion_semana.planificacion_semana import (
	CONCEPTO_PROYECTO,
	CONCEPTO_VACACIONES,
	CONCEPTOS_SEMANALES,
	ESTADOS_PLANIFICABLES,
)

# Filas fijas de la imputación (salen siempre). Las vacaciones no se imputan: se leen de la planificación.
CONCEPTOS_IMPUTABLES = CONCEPTOS_SEMANALES

# Máximo de horas en un día, sumando todas las filas
MAXIMO_DIARIO = 24


def cierre(semana):
	"""Una semana se cierra para imputar el martes a las 00:00 de la semana siguiente (lunes + 8 días)."""
	return getdate(semana) + timedelta(days=8)


def esta_cerrada(semana):
	return getdate(today()) >= cierre(semana)


def planificado_de(empleado, semana):
	"""Lo planificado para una persona en una semana:
	{"proyectos": {proyecto: horas}, "conceptos": {concepto: horas}, "vacaciones": {fecha: horas},
	 "comentarios": {proyecto o concepto: texto}}"""
	resultado = {"proyectos": {}, "conceptos": {}, "vacaciones": {}, "comentarios": {}}
	plan = frappe.db.get_value("Planificacion Semana", {"semana": getdate(semana)})
	if not plan:
		return resultado

	for a in frappe.get_all(
		"Asignacion Planificacion",
		filters={"parenttype": "Planificacion Semana", "parent": plan, "empleado": empleado},
		fields=["concepto", "proyecto", "fecha", "horas", "comentario"],
	):
		if a.concepto == CONCEPTO_PROYECTO:
			resultado["proyectos"][a.proyecto] = flt(a.horas)
		elif a.concepto == CONCEPTO_VACACIONES:
			resultado["vacaciones"][getdate(a.fecha)] = flt(a.horas)
		else:
			resultado["conceptos"][a.concepto] = flt(a.horas)
		if a.comentario and a.concepto != CONCEPTO_VACACIONES:
			fila = a.proyecto if a.concepto == CONCEPTO_PROYECTO else a.concepto
			resultado["comentarios"][fila] = a.comentario
	return resultado


def dias_editables(empleado, semana):
	"""Días en los que se puede imputar: ya han llegado, su semana no está cerrada y no son festivo ni
	tienen vacaciones."""
	if esta_cerrada(semana):
		return set()
	hoy = getdate(today())
	bloqueados = set(festivos_de_semana(semana)) | set(planificado_de(empleado, semana)["vacaciones"])
	return {d for d in dias_de_semana(semana) if d <= hoy and d not in bloqueados}


def es_planificable(proyecto):
	"""Proyecto aceptado o en curso que no es acuerdo marco (lo que ofrece "Añadir proyecto")."""
	datos = frappe.db.get_value("Proyecto", proyecto, ["tipo", "estado"], as_dict=True)
	return bool(datos) and datos.tipo != "Acuerdo marco" and datos.estado in ESTADOS_PLANIFICABLES