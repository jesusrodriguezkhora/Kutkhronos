"""Semanas, festivos y plantilla: lo que comparten el controlador de Planificacion Semana y la API."""
from datetime import timedelta

import frappe
from frappe.utils import flt, getdate, today

from prototipo.planificacion.festivos import festivos_entre
from prototipo.roles import ROL_COORDINADOR, ROL_EMPLEADO

# Quién aparece en la planificación: cuentas activas con estos roles y horas semanales definidas
ROLES_PLANTILLA = (ROL_EMPLEADO, ROL_COORDINADOR)

# La semana de trabajo va de lunes a viernes
DIAS_SEMANA = 5


def lunes_de(fecha):
	fecha = getdate(fecha)
	return fecha - timedelta(days=fecha.weekday())

def es_pasada(semana):
	"""Una semana es pasada (solo lectura) cuando ya ha empezado la siguiente."""
	return getdate(semana) < lunes_de(today())


def dias_de_semana(lunes):
	"""Los cinco días (lunes a viernes) de la semana que empieza en `lunes`."""
	lunes = getdate(lunes)
	return [lunes + timedelta(days=i) for i in range(DIAS_SEMANA)]


def festivos_de_semana(lunes):
	dias = dias_de_semana(lunes)
	return sorted(festivos_entre(dias[0], dias[-1]))


def dias_laborables(lunes):
	return DIAS_SEMANA - len(festivos_de_semana(lunes))


def horas_maximas(horas_semanales, laborables):
	"""Las horas semanales del contrato, en proporción a los días laborables de la semana."""
	return flt(horas_semanales) * laborables / DIAS_SEMANA


def plantilla():
	"""Empleados y coordinadores activos con horas semanales: [{usuario, nombre, horas_semanales}],
	ordenados por nombre."""
	usuarios = frappe.get_all(
		"Has Role",
		filters={"role": ["in", ROLES_PLANTILLA], "parenttype": "User"},
		pluck="parent",
		distinct=True,
	)
	if not usuarios:
		return []

	activos = {
		u.name: u.full_name
		for u in frappe.get_all("User", filters={"name": ["in", usuarios], "enabled": 1}, fields=["name", "full_name"])
	}
	if not activos:
		return []

	equipo = [
		{"usuario": d.usuario, "nombre": activos[d.usuario] or d.usuario, "horas_semanales": flt(d.horas_semanales)}
		for d in frappe.get_all(
			"Datos Laborales",
			filters={"usuario": ["in", list(activos)], "horas_semanales": [">", 0]},
			fields=["usuario", "horas_semanales"],
		)
	]
	return sorted(equipo, key=lambda e: e["nombre"].lower())

def jornada_diaria(horas_semanales):
	"""Horas de un día de trabajo: las semanales repartidas de lunes a viernes."""
	return flt(horas_semanales) / DIAS_SEMANA