# Copyright (c) 2026, aaaa and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.model.naming import getseries, make_autoname
from frappe.utils import nowdate

PREFIJOS = {
	"Contrato": "CON",
	"Contrato basado": "CB",
	"Acuerdo marco": "AM",
	"Subvención": "SUB",
}


class Proyecto(Document):
	# begin: auto-generated types
	# ... (no tocar)
	# end: auto-generated types

	def autoname(self):
		if self.acuerdo_marco:
			# Subcontrato: código del acuerdo + correlativo propio de ese acuerdo
			self.name = f"{self.acuerdo_marco}-{getseries(self.acuerdo_marco + '-', 2)}"
		else:
			anio = nowdate()[:4]
			prefijo = PREFIJOS[self.tipo]
			self.name = make_autoname(f"{prefijo}-{anio}-.###")

	def validate(self):
		pass