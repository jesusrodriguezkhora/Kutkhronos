from frappe.model.document import Document
from frappe.utils import flt

# Semanas que se cuentan en un año para calcular las horas anuales
SEMANAS_ANIO = 52


def calcular_coste_hora(salario_anual, horas_semanales):
	"""Salario anual entre las horas que se trabajan en un año. None si falta alguno de los dos datos."""
	horas_anio = flt(horas_semanales) * SEMANAS_ANIO
	if flt(salario_anual) <= 0 or horas_anio <= 0:
		return None
	return flt(salario_anual) / horas_anio


class DatosLaborales(Document):
	def validate(self):
		self.coste_hora = calcular_coste_hora(self.salario_anual, self.horas_semanales)
