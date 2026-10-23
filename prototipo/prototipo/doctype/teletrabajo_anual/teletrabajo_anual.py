from frappe.model.document import Document


class TeletrabajoAnual(Document):
	def autoname(self):
		# Uno por persona y año
		self.name = f"TEL-{self.anio}-{self.empleado}"