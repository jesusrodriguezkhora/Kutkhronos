import frappe
from frappe.model.document import Document
from frappe.utils import flt

from prototipo.gastos import ESTADOS_GASTOS_EDITABLES


def comprobar_proyecto(proyecto):
	"""Los gastos directos van en proyectos aceptados o en curso, nunca en un acuerdo marco (van en sus
	contratos basados)."""
	datos = frappe.db.get_value("Proyecto", proyecto, ["tipo", "estado"], as_dict=True)
	if not datos:
		frappe.throw(f"El proyecto {proyecto} no existe.")
	if datos.tipo == "Acuerdo marco":
		frappe.throw("Los gastos directos se registran en los contratos basados, no en el acuerdo marco.")
	if datos.estado not in ESTADOS_GASTOS_EDITABLES:
		frappe.throw(
			f"{proyecto} está en estado {datos.estado or 'sin estado'}: solo se registran o cambian gastos "
			"de proyectos aceptados o en curso."
		)


class GastoDirecto(Document):
	def validate(self):
		self.concepto = (self.concepto or "").strip()
		if not self.concepto:
			frappe.throw("El concepto es obligatorio.")
		if flt(self.coste) <= 0:
			frappe.throw("El coste debe ser mayor que cero.")

		comprobar_proyecto(self.proyecto)
		# Si se mueve a otro proyecto, el de origen tampoco puede estar cerrado
		antes = self.get_doc_before_save()
		if antes and antes.proyecto != self.proyecto:
			comprobar_proyecto(antes.proyecto)

	def on_trash(self):
		comprobar_proyecto(self.proyecto)