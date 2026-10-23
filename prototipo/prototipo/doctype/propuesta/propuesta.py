import frappe
from frappe.model.document import Document
from frappe.utils import cint, flt

from prototipo.prototipo.doctype.proyecto.proyecto import ESTADOS_CON_FEE, TIPOS_CON_FEE

# Categorías de personal de la propuesta, en el orden de la tabla.
# Son las posiciones de Datos Laborales: de ellas sale el coste/hora medio.
POSICIONES = ("Director", "Coordinador", "Consultor Senior", "Consultor", "Prácticas")

# Gastos indirectos: porcentaje fijo de los honorarios
PORCENTAJE_INDIRECTOS = 12

# Márgenes objetivo (%), iguales para todos los proyectos. Los usa la SPA para resaltar los márgenes.
MARGEN_BRUTO_OBJETIVO = 40
MARGEN_NETO_OBJETIVO = 25

# Importes que introduce el usuario (no pueden ser negativos)
IMPORTES = ("honorarios", "viajes", "otros_costes_directos", "subcontratacion")


def coste_hora_medio():
	"""{posición: coste/hora medio} de los empleados activos que tienen posición y coste/hora."""
	activos = set(frappe.get_all("User", filters={"enabled": 1}, pluck="name"))
	por_posicion = {}
	for d in frappe.get_all(
		"Datos Laborales",
		filters={"posicion": ["in", POSICIONES], "coste_hora": [">", 0]},
		fields=["usuario", "posicion", "coste_hora"],
	):
		if d.usuario in activos:
			por_posicion.setdefault(d.posicion, []).append(flt(d.coste_hora))
	return {p: sum(costes) / len(costes) for p, costes in por_posicion.items()}


def porcentaje(valor, base):
	return flt(valor) / flt(base) * 100 if flt(base) else 0


class Propuesta(Document):
	def validate(self):
		self.validar_honorarios_obligatorios()
		self.validar_importes()
		self.completar_lineas()
		self.calcular()

	def validar_importes(self):
		for campo in IMPORTES:
			if flt(self.get(campo)) < 0:
				frappe.throw(f"{self.meta.get_label(campo)} no puede ser negativo.")

	def completar_lineas(self):
		"""Rehace la tabla de personal: una fila por posición, en orden fijo, con el coste/hora medio
		de hoy. Así el coste queda congelado hasta la próxima vez que se guarde la propuesta."""
		horas = {l.categoria: cint(l.horas) for l in self.lineas}
		medias = coste_hora_medio()

		self.set("lineas", [])
		for posicion in POSICIONES:
			h = horas.get(posicion, 0)
			if h < 0:
				frappe.throw(f"Las horas de {posicion} no pueden ser negativas.")
			coste_hora = flt(medias.get(posicion), 2)
			if h and not coste_hora:
				frappe.throw(
					f"No hay empleados activos con posición {posicion} y coste/hora: "
					"no se puede calcular el coste de sus horas."
				)
			self.append(
				"lineas",
				{"categoria": posicion, "horas": h, "coste_hora": coste_hora, "coste": flt(h * coste_hora, 2)},
			)

	def calcular(self):
		honorarios = flt(self.honorarios)
		directos = flt(self.viajes) + flt(self.otros_costes_directos)

		self.coste_personal = flt(sum(flt(l.coste) for l in self.lineas), 2)
		self.gastos_indirectos = flt(honorarios * PORCENTAJE_INDIRECTOS / 100, 2)
		self.coste_total = flt(
			self.coste_personal + directos + flt(self.subcontratacion) + self.gastos_indirectos, 2
		)

		self.margen_bruto = flt(honorarios - self.coste_personal - directos - flt(self.subcontratacion), 2)
		self.margen_neto = flt(self.margen_bruto - self.gastos_indirectos, 2)
		self.margen_bruto_pct = flt(porcentaje(self.margen_bruto, honorarios), 2)
		self.margen_neto_pct = flt(porcentaje(self.margen_neto, honorarios), 2)

	def validar_honorarios_obligatorios(self):
		"""Un proyecto aceptado o en curso debe tener honorarios en su fee estimate."""
		if flt(self.honorarios) > 0:
			return
		proyecto = frappe.db.get_value("Proyecto", self.proyecto, ["tipo", "estado"], as_dict=True)
		if proyecto and proyecto.tipo in TIPOS_CON_FEE and proyecto.estado in ESTADOS_CON_FEE:
			frappe.throw(
				f"{self.proyecto} está en estado {proyecto.estado}: su fee estimate debe tener honorarios."
			)

	