"""Gastos de los proyectos: lo que comparten la carga de horas, Gasto Directo y la API de gastos."""
import frappe
from frappe.utils import flt

from prototipo.prototipo.doctype.propuesta.propuesta import coste_hora_medio

# Estados en los que un proyecto muestra su pestaña Gastos
ESTADOS_CON_GASTOS = ("Aceptado", "En curso", "Cerrado")

# Estados en los que se pueden registrar o cambiar gastos directos (cerrado: solo lectura)
ESTADOS_GASTOS_EDITABLES = ("Aceptado", "En curso")


def coste_actual(empleado):
	"""(posición, coste/hora medio de esa posición hoy) de una persona. Sin posición o sin media de esa
	posición, el coste es 0 (sus horas cuentan, pero no suman gasto)."""
	posicion = frappe.db.get_value("Datos Laborales", empleado, "posicion")
	if not posicion:
		return None, 0
	return posicion, flt(coste_hora_medio().get(posicion), 2)