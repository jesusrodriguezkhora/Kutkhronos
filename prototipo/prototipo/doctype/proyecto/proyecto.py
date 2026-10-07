# Copyright (c) 2026, aaaa and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class Proyecto(Document):
	
	def validate(self):
		if self.estado != "Abierto" and not self.fecha_inicio:
			frappe.throw("Un proyecto en curso o cerrado debe tener fecha de inico")

