import frappe
from frappe.model.document import Document
from frappe.utils import flt


class ObjetivoAnual(Document):
	"""Budget goal de un año: lo que se quiere conseguir ese año con los proyectos aceptados. Uno por año
	(se llama como el año). Se edita desde el panel."""

	def validate(self):
		if flt(self.importe) < 0:
			frappe.throw("El objetivo no puede ser negativo.")
