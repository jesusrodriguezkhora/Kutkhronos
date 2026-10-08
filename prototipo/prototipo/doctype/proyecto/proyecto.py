import frappe
from frappe.model.document import Document
from frappe.model.naming import getseries, make_autoname
from frappe.utils import flt, fmt_money, nowdate

PREFIJOS = {
	"Contrato": "CON",
	"Contrato basado": "CB",
	"Acuerdo marco": "AM",
	"Subvención": "SUB",
}

# Estados de un subcontrato que consumen presupuesto del acuerdo marco
ESTADOS_COMPUTABLES = ("Aceptado", "En curso", "Cerrado")


def calcular_consumido(acuerdo, excluir=None):
	"""Suma el importe de los subcontratos computables de un acuerdo marco."""
	filtros = {"acuerdo_marco": acuerdo, "estado": ["in", ESTADOS_COMPUTABLES]}
	if excluir:
		filtros["name"] = ["!=", excluir]
	importes = frappe.get_all("Proyecto", filters=filtros, pluck="importe")
	return sum(flt(i) for i in importes)


def actualizar_saldo(acuerdo, excluir=None):
	"""Recalcula y guarda el consumido y el disponible de un acuerdo marco."""
	importe = flt(frappe.db.get_value("Proyecto", acuerdo, "importe"))
	consumido = calcular_consumido(acuerdo, excluir)
	frappe.db.set_value(
		"Proyecto",
		acuerdo,
		{"importe_consumido": consumido, "importe_disponible": importe - consumido},
	)


class Proyecto(Document):
	# begin: auto-generated types
	# ... (conserva aquí el bloque de tu fichero)
	# end: auto-generated types

	def autoname(self):
		if self.acuerdo_marco:
			self.name = f"{self.acuerdo_marco}-{getseries(self.acuerdo_marco + '-', 2)}"
		else:
			anio = nowdate()[:4]
			self.name = make_autoname(f"{PREFIJOS[self.tipo]}-{anio}-.###")

	def validate(self):
		if self.tipo == "Acuerdo marco":
			self.validar_acuerdo_marco()
		if self.acuerdo_marco:
			self.validar_subcontrato()

	def validar_acuerdo_marco(self):
		if self.acuerdo_marco:
			frappe.throw("Un acuerdo marco no puede depender de otro acuerdo marco.")
		if flt(self.importe) <= 0:
			frappe.throw("Un acuerdo marco debe tener un importe inicial mayor que cero.")

		consumido = 0 if self.is_new() else calcular_consumido(self.name)
		if consumido > flt(self.importe):
			frappe.throw(
				f"El importe no puede ser menor que lo ya consumido por sus subcontratos "
				f"({fmt_money(consumido, currency='EUR')})."
			)
		self.importe_consumido = consumido
		self.importe_disponible = flt(self.importe) - consumido

	def validar_subcontrato(self):
		tipo_padre, importe_padre = frappe.db.get_value(
			"Proyecto", self.acuerdo_marco, ["tipo", "importe"]
		)
		if tipo_padre != "Acuerdo marco":
			frappe.throw(f"{self.acuerdo_marco} no es un acuerdo marco.")

		if self.estado in ESTADOS_COMPUTABLES:
			disponible = flt(importe_padre) - calcular_consumido(self.acuerdo_marco, excluir=self.name)
			if flt(self.importe) > disponible:
				frappe.throw(
					f"El importe supera el saldo disponible del acuerdo marco "
					f"({fmt_money(disponible, currency='EUR')})."
				)

	def on_update(self):
		if self.acuerdo_marco:
			actualizar_saldo(self.acuerdo_marco)

	def on_trash(self):
		if self.acuerdo_marco:
			actualizar_saldo(self.acuerdo_marco, excluir=self.name)