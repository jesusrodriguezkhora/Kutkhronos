import math
from datetime import timedelta

import frappe
from frappe.model.document import Document
from frappe.model.naming import getseries, make_autoname
from frappe.utils import add_months, cint, flt, fmt_money, getdate, nowdate

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
CAMPOS_HEREDADOS = ("cliente",)

# Vía de todos los contratos basados (y solo de ellos)
VIA_BASADO = "Heredada"

# Campos exclusivos de las subvenciones
CAMPOS_SUBVENCION = ("lider_proyecto", "miembros_consorcio")

# Para pasar a estos estados, los proyectos de estos tipos necesitan un fee estimate (Propuesta)
# guardado con honorarios
ESTADOS_CON_FEE = ("Aceptado", "En curso")
TIPOS_CON_FEE = ("Contrato", "Contrato basado", "Subvención")


def tiene_fee(proyecto):
	"""¿Tiene el proyecto un fee estimate guardado con honorarios? (la Propuesta se llama como el proyecto)"""
	return flt(frappe.db.get_value("Propuesta", proyecto, "honorarios")) > 0


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

CALCULO_POR_DURACION = "Por duración"


def meses_entre(inicio, fin):
	"""Meses de inicio a fin, redondeando siempre al siguiente mes entero (15/01 -> 10/07 = 6;
	01/01/2026 -> 01/01/2027 = 12)."""
	inicio, fin = getdate(inicio), getdate(fin)
	meses = (fin.year - inicio.year) * 12 + fin.month - inicio.month
	if getdate(add_months(inicio, meses)) > fin:
		meses -= 1
	if getdate(add_months(inicio, meses)) < fin:
		meses += 1
	return max(meses, 0)


def a_meses(duracion, unidad):
	"""Duración en meses enteros (1,5 años = 18 meses), redondeando hacia arriba si no sale exacto."""
	meses = flt(duracion) * (12 if unidad == "Años" else 1)
	return math.ceil(meses - 1e-9)


def anios_del_proyecto(inicio, fin):
	"""Años naturales que toca el proyecto. La fecha de fin no cuenta como día trabajado (un
	proyecto de 12 meses del 01/01/2026 al 01/01/2027 es solo de 2026). Sin fechas: []."""
	if not inicio or not fin or getdate(fin) < getdate(inicio):
		return []
	inicio, fin = getdate(inicio), getdate(fin)
	ultimo = fin - timedelta(days=1) if fin > inicio else fin
	return list(range(inicio.year, ultimo.year + 1))


def repartir_importe(importe, anios):
	"""Reparto por defecto: importe / número de años, en céntimos; la diferencia del redondeo va al
	último año, para que la suma sea exactamente el importe. [(año, importe), …]"""
	centimos = round(flt(importe) * 100)
	base = centimos // len(anios)
	resto = centimos - base * len(anios)
	return [(a, (base + (resto if i == len(anios) - 1 else 0)) / 100) for i, a in enumerate(anios)]

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
			# Año del código en dos cifras (CON-26-001): el de la fecha de alta, que normalmente es el año
			# actual. En la importación del Excel, el alta es el día de la importación, así que se usa la
			# fecha de inicio (la única fecha de referencia que tenemos de esos proyectos).
			fecha_codigo = self.fecha_alta
			if frappe.flags.importando_proyectos and self.fecha_inicio:
				fecha_codigo = self.fecha_inicio
			anio = str(getdate(fecha_codigo or nowdate()).year)
			# La serie sigue la numeración que ya tuviera ese año con el formato anterior
			# de cuatro cifras (CON-2026-001)
			continuar_serie(f"{prefijo}-{anio[2:]}-", f"{prefijo}-{anio}-")
			self.name = make_autoname(f"{prefijo}-{anio[2:]}-.###")
		else:
			frappe.throw("Un contrato basado solo puede crearse desde un acuerdo marco.")

	def validate(self):
		self.normalizar()
		self.calcular_duracion()
		self.validar_fechas()
		self.validar_importes_anuales()
		self.validar_responsable()
		self.validar_fee_estimate()
		self.validar_motivo_rechazo()

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
			self.via = VIA_BASADO
			for campo in CAMPOS_HEREDADOS:
				self.set(campo, acuerdo.get(campo))

		elif self.tipo == "Contrato basado":
			frappe.throw("Un contrato basado solo puede crearse desde un acuerdo marco.")

		if self.tipo == "Subvención":
			self.via = "Subvención"
		else:
			if self.via == "Subvención":
				frappe.throw("Solo las subvenciones pueden tener la vía Subvención.")
			if self.via == VIA_BASADO and not self.acuerdo_marco:
				frappe.throw("La vía Heredada solo es para contratos basados.")
			for campo in CAMPOS_SUBVENCION:
				self.set(campo, None)

	def calcular_duracion(self):
		"""Duración y fecha de fin, una calculada a partir de la otra. La fecha de fin manda: con inicio y
		fin, la duración sale de las fechas (meses redondeando al alza, o años con dos decimales); sin
		fin, la fecha de fin sale de la duración (mismo día N meses después)."""
		self.unidad_duracion = self.unidad_duracion or "Meses"
		if flt(self.duracion) < 0:
			frappe.throw("La duración no puede ser negativa.")

		if self.fecha_inicio and self.fecha_fin:
			if getdate(self.fecha_fin) >= getdate(self.fecha_inicio):
				meses = meses_entre(self.fecha_inicio, self.fecha_fin)
				self.duracion = meses if self.unidad_duracion == "Meses" else flt(meses / 12, 2)
			else:
				self.duracion = None  # el error lo da validar_fechas
		elif self.fecha_inicio and flt(self.duracion) > 0:
			self.fecha_fin = add_months(getdate(self.fecha_inicio), a_meses(self.duracion, self.unidad_duracion))

	# --- Fase 2: comprobar las reglas que dependen del usuario ---

	def validar_fechas(self):
		# La fecha de alta es solo cuándo se registró en Khronos: un proyecto importado puede haber
		# terminado antes. La regla que importa es entre inicio y fin.
		if self.fecha_fin and self.fecha_inicio and getdate(self.fecha_fin) < getdate(self.fecha_inicio):
			frappe.throw("La fecha de fin no puede ser anterior a la fecha de inicio.")

	def validar_importes_anuales(self):
		"""Una fila por año natural del proyecto y, entre todas, el importe total. Si llega vacía, se
		pone el reparto por defecto. Sin fechas de inicio y fin, no hay filas."""
		anios = anios_del_proyecto(self.fecha_inicio, self.fecha_fin)
		if not anios:
			self.set("importes_anuales", [])
			return
		if not self.importes_anuales:
			self.set("importes_anuales", [{"anio": a, "importe": i} for a, i in repartir_importe(self.importe, anios)])
			return

		por_anio = {}
		for fila in self.importes_anuales:
			anio = cint(fila.anio)
			if anio in por_anio:
				frappe.throw(f"El año {anio} está repetido en el importe por año.")
			if flt(fila.importe) < 0:
				frappe.throw(f"El importe de {anio} no puede ser negativo.")
			por_anio[anio] = flt(fila.importe, 2)

		if sorted(por_anio) != anios:
			frappe.throw(
				f"El importe por año debe tener una fila por cada año del proyecto ({anios[0]} a {anios[-1]})."
			)
		suma = sum(por_anio.values())
		if abs(suma - flt(self.importe)) > 0.005:
			frappe.throw(
				f"La suma del importe por año ({fmt_money(suma, currency='EUR')}) debe ser igual al importe "
				f"total ({fmt_money(self.importe, currency='EUR')})."
			)
		# Ordenadas por año
		self.set("importes_anuales", [{"anio": a, "importe": por_anio[a]} for a in anios])

	def validar_responsable(self):
		# Solo se comprueba al ponerlo o cambiarlo: si un empleado se da de baja más tarde,
		# sus proyectos se siguen pudiendo editar sin tener que cambiar el responsable.
		if not self.responsable or not self.has_value_changed("responsable"):
			return
		if self.responsable not in {u.name for u in responsables_posibles()}:
			frappe.throw("El responsable debe ser un empleado o coordinador activo.")

	def validar_fee_estimate(self):
		"""Para pasar a aceptado o en curso hace falta un fee estimate guardado con honorarios.
		Solo se comprueba al cambiar de estado: los proyectos que ya estaban así (p. ej., migrados) se
		siguen pudiendo editar. La importación de proyectos se salta la regla."""
		if frappe.flags.importando_proyectos:
			return
		if self.tipo not in TIPOS_CON_FEE or self.estado not in ESTADOS_CON_FEE:
			return
		if not self.is_new() and not self.has_value_changed("estado"):
			return
		if self.is_new():
			frappe.throw(
				f"Un proyecto nuevo no puede crearse en estado {self.estado}: primero guárdalo como "
				"oportunidad y prepara su fee estimate."
			)
		if not tiene_fee(self.name):
			frappe.throw(
				f"Para pasar a {self.estado} hace falta un fee estimate guardado con honorarios. "
				"Guárdalo en la pestaña Fee Estimate y vuelve a cambiar el estado."
			)

	def validar_motivo_rechazo(self):
		"""Al pasar a Rechazado hace falta un motivo; si sale de Rechazado, el motivo se borra.
		Los que ya estaban rechazados sin motivo (p. ej. migrados) se siguen pudiendo editar, y la
		importación del Excel no lo exige."""
		if self.estado != "Rechazado":
			self.motivo_rechazo = None
			return

		self.motivo_rechazo = (self.motivo_rechazo or "").strip() or None
		if frappe.flags.importando_proyectos or self.motivo_rechazo:
			return
		pasa_a_rechazado = self.is_new() or self.has_value_changed("estado")
		borra_el_motivo = not self.is_new() and self.has_value_changed("motivo_rechazo")
		if pasa_a_rechazado or borra_el_motivo:
			frappe.throw("Indica el motivo de rechazo del proyecto.")

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
		# La propuesta es parte del proyecto: se borra con él
		if frappe.db.exists("Propuesta", self.name):
			frappe.delete_doc("Propuesta", self.name, ignore_permissions=True)

	def propagar_a_contratos_basados(self):
		"""Copia cliente y vía del acuerdo a sus contratos basados si han cambiado."""
		cambios = {c: self.get(c) for c in CAMPOS_HEREDADOS if self.has_value_changed(c)}
		if not cambios:
			return
		for nombre in frappe.get_all("Proyecto", filters={"acuerdo_marco": self.name}, pluck="name"):
			frappe.db.set_value("Proyecto", nombre, cambios)