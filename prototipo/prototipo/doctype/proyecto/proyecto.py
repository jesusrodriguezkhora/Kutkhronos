import frappe
from frappe.model.document import Document
from frappe.model.naming import getseries, make_autoname
from frappe.utils import flt, fmt_money, getdate, nowdate

from prototipo.api.responsables import responsables_posibles

# Prefijos de los proyectos que se crean sueltos.
# Los contratos basados no tienen prefijo propio: su código deriva del acuerdo marco.
PREFIJOS = {
	"Contrato": "CON",
	"Acuerdo marco": "AM",
	"Subvención": "SUB",
}

# Estados de un contrato basado que consumen presupuesto del acuerdo marco
ESTADOS_COMPUTABLES = ("Aceptado", "En curso", "Cerrado")

# Estados en los que un acuerdo marco admite contratos basados (ya ha sido aceptado)
ESTADOS_ACUERDO_CON_BASADOS = ESTADOS_COMPUTABLES

# Campos que el contrato basado hereda de su acuerdo marco
CAMPOS_HEREDADOS = ("cliente", "via")

# Campos exclusivos de las subvenciones
CAMPOS_SUBVENCION = ("lider_proyecto", "miembros_consorcio")


def calcular_consumido(acuerdo, excluir=None):
	"""Suma el importe de los contratos basados computables de un acuerdo marco."""
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


def continuar_serie(nueva, anterior):
	"""Crea el contador de la serie nueva con el valor del de la anterior, si la nueva aún no existe."""
	if frappe.db.sql("select 1 from `tabSeries` where name = %s", nueva):
		return
	actual = frappe.db.sql("select current from `tabSeries` where name = %s", anterior)
	if actual:
		frappe.db.sql("insert into `tabSeries` (name, current) values (%s, %s)", (nueva, actual[0][0]))


class Proyecto(Document):
	# begin: auto-generated types
	# ... (conserva aquí el bloque de tu fichero)
	# end: auto-generated types

	def autoname(self):
		if self.acuerdo_marco:
			# Contrato basado: código del acuerdo + correlativo propio de ese acuerdo
			self.name = f"{self.acuerdo_marco}-{getseries(self.acuerdo_marco + '-', 2)}"
		elif self.tipo in PREFIJOS:
			prefijo = PREFIJOS[self.tipo]
			# Año de la fecha de alta en dos cifras (CON-26-001). Normalmente es el año actual;
			# solo la migración crea proyectos con fechas pasadas.
			anio = str(getdate(self.fecha_alta or nowdate()).year)
			# La serie sigue la numeración que ya tuviera ese año con el formato anterior
			# de cuatro cifras (CON-2026-001)
			continuar_serie(f"{prefijo}-{anio[2:]}-", f"{prefijo}-{anio}-")
			self.name = make_autoname(f"{prefijo}-{anio[2:]}-.###")
		else:
			frappe.throw("Un contrato basado solo puede crearse desde un acuerdo marco.")

	def validate(self):
		self.normalizar()
		self.validar_fechas()
		self.validar_responsable()

		if self.tipo == "Acuerdo marco":
			self.validar_acuerdo_marco()
		if self.acuerdo_marco:
			self.validar_contrato_basado()

	# --- Fase 1: fijar los valores que se deducen de otros ---

	def normalizar(self):
		if self.acuerdo_marco:
			acuerdo = frappe.db.get_value(
				"Proyecto", self.acuerdo_marco, ["tipo", *CAMPOS_HEREDADOS], as_dict=True
			)
			if not acuerdo or acuerdo.tipo != "Acuerdo marco":
				frappe.throw(f"{self.acuerdo_marco} no es un acuerdo marco.")
			self.tipo = "Contrato basado"
			for campo in CAMPOS_HEREDADOS:
				self.set(campo, acuerdo.get(campo))

		elif self.tipo == "Contrato basado":
			frappe.throw("Un contrato basado solo puede crearse desde un acuerdo marco.")

		if self.tipo == "Subvención":
			self.via = "Subvención"
		else:
			if self.via == "Subvención":
				frappe.throw("Solo las subvenciones pueden tener la vía Subvención.")
			for campo in CAMPOS_SUBVENCION:
				self.set(campo, None)

	# --- Fase 2: comprobar las reglas que dependen del usuario ---

	def validar_fechas(self):
		if self.fecha_fin and self.fecha_alta and getdate(self.fecha_fin) < getdate(self.fecha_alta):
			frappe.throw("La fecha de fin no puede ser anterior a la fecha de alta.")

	def validar_responsable(self):
		# Solo se comprueba al ponerlo o cambiarlo: si un empleado se da de baja más tarde,
		# sus proyectos se siguen pudiendo editar sin tener que cambiar el responsable.
		if not self.responsable or not self.has_value_changed("responsable"):
			return
		if self.responsable not in {u.name for u in responsables_posibles()}:
			frappe.throw("El responsable debe ser un empleado o coordinador activo.")

	def validar_acuerdo_marco(self):
		if flt(self.importe) <= 0:
			frappe.throw("Un acuerdo marco debe tener un importe inicial mayor que cero.")

		consumido = 0 if self.is_new() else calcular_consumido(self.name)
		if consumido > flt(self.importe):
			frappe.throw(
				f"El importe no puede ser menor que lo ya consumido por sus contratos basados "
				f"({fmt_money(consumido, currency='EUR')})."
			)
		self.importe_consumido = consumido
		self.importe_disponible = flt(self.importe) - consumido

		if (
			not self.is_new()
			and self.has_value_changed("estado")
			and self.estado not in ESTADOS_ACUERDO_CON_BASADOS
		):
			basados = frappe.db.count("Proyecto", {"acuerdo_marco": self.name})
			if basados:
				frappe.throw(
					f"No se puede pasar a {self.estado or 'sin estado'} un acuerdo marco con "
					f"{basados} {'contrato basado' if basados == 1 else 'contratos basados'}."
				)

	def validar_contrato_basado(self):
		if self.is_new():
			estado_acuerdo = frappe.db.get_value("Proyecto", self.acuerdo_marco, "estado")
			if estado_acuerdo not in ESTADOS_ACUERDO_CON_BASADOS:
				frappe.throw(
					"Solo se pueden añadir contratos basados a un acuerdo marco aceptado "
					f"(este está en {estado_acuerdo or 'sin estado'})."
				)
	
		if self.estado in ESTADOS_COMPUTABLES:
			importe_acuerdo = flt(frappe.db.get_value("Proyecto", self.acuerdo_marco, "importe"))
			disponible = importe_acuerdo - calcular_consumido(self.acuerdo_marco, excluir=self.name)
			if flt(self.importe) > disponible:
				frappe.throw(
					f"El importe supera el saldo disponible del acuerdo marco "
					f"({fmt_money(disponible, currency='EUR')})."
				)

	# --- Después de guardar o borrar ---

	def on_update(self):
		if self.acuerdo_marco:
			actualizar_saldo(self.acuerdo_marco)

		if self.tipo == "Acuerdo marco":
			self.propagar_a_contratos_basados()

	def on_trash(self):
		if self.acuerdo_marco:
			actualizar_saldo(self.acuerdo_marco, excluir=self.name)

	def propagar_a_contratos_basados(self):
		"""Copia cliente y vía del acuerdo a sus contratos basados si han cambiado."""
		cambios = {c: self.get(c) for c in CAMPOS_HEREDADOS if self.has_value_changed(c)}
		if not cambios:
			return
		for nombre in frappe.get_all("Proyecto", filters={"acuerdo_marco": self.name}, pluck="name"):
			frappe.db.set_value("Proyecto", nombre, cambios)