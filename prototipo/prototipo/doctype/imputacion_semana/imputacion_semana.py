import frappe
from frappe.model.document import Document
from frappe.utils import flt, getdate

from prototipo.imputacion.reglas import (
	CONCEPTO_PROYECTO,
	MAXIMO_DIARIO,
	dias_editables,
	es_planificable,
	planificado_de,
)
from prototipo.planificacion.semanas import dias_de_semana

# Campos de Teletrabajo Anual, en el orden de WEEKDAY() de MariaDB (0 = lunes)
CAMPOS_DIA = ("lunes", "martes", "miercoles", "jueves", "viernes")


def clave(linea):
	"""Identifica una celda: (concepto, proyecto, fecha). El proyecto solo en las filas de proyecto."""
	proyecto = linea.proyecto if linea.concepto == CONCEPTO_PROYECTO else None
	return (linea.concepto, proyecto, getdate(linea.fecha) if linea.fecha else None)


def celdas(doc):
	"""{(concepto, proyecto, fecha): horas} de una imputación ({} si no hay documento)."""
	return {clave(l): flt(l.horas) for l in doc.lineas} if doc else {}


def dias_teletrabajo(doc):
	return {getdate(t.fecha) for t in doc.teletrabajo} if doc else set()


def horas(valor):
	"""12.0 -> "12", 7.5 -> "7,5" (para los mensajes)."""
	return f"{flt(valor):g}".replace(".", ",")


def dia(fecha):
	return fecha.strftime("%d/%m")


def recalcular_horas_imputadas(proyectos):
	"""Acumulado de horas imputadas de cada proyecto, en todas las semanas y personas."""
	for proyecto in filter(None, set(proyectos)):
		if not frappe.db.exists("Proyecto", proyecto):
			continue
		total = frappe.db.sql(
			"""select coalesce(sum(horas), 0) from `tabLinea Imputacion`
			where parenttype = 'Imputacion Semana' and concepto = %s and proyecto = %s""",
			(CONCEPTO_PROYECTO, proyecto),
		)[0][0]
		frappe.db.set_value("Proyecto", proyecto, "horas_imputadas", flt(total), update_modified=False)


def recalcular_teletrabajo(empleado, anios):
	"""Días teletrabajados de una persona por día de la semana, en cada año indicado. Un día cuenta
	en el año de su fecha."""
	for anio in set(anios):
		conteo = dict(
			frappe.db.sql(
				"""select weekday(t.fecha), count(*) from `tabTeletrabajo Imputacion` t
				join `tabImputacion Semana` i on i.name = t.parent
				where t.parenttype = 'Imputacion Semana' and i.empleado = %s and year(t.fecha) = %s
				group by weekday(t.fecha)""",
				(empleado, anio),
			)
		)
		valores = {campo: int(conteo.get(i, 0)) for i, campo in enumerate(CAMPOS_DIA)}

		nombre = f"TEL-{anio}-{empleado}"
		if frappe.db.exists("Teletrabajo Anual", nombre):
			doc = frappe.get_doc("Teletrabajo Anual", nombre)
		else:
			doc = frappe.new_doc("Teletrabajo Anual")
			doc.empleado = empleado
			doc.anio = anio
		doc.update({**valores, "total": sum(valores.values())})
		doc.save(ignore_permissions=True)


class ImputacionSemana(Document):
	def autoname(self):
		# Una imputación por persona y semana: el nombre ya lo garantiza
		self.name = f"IMP-{getdate(self.semana)}-{self.empleado}"

	def validate(self):
		if getdate(self.semana).weekday() != 0:
			frappe.throw("La semana de una imputación debe empezar en lunes.")

		self.normalizar()

		antes = self.get_doc_before_save()
		ahora = celdas(self)
		previas = celdas(antes)
		cambiadas = {k for k in set(previas) | set(ahora) if previas.get(k) != ahora.get(k)}
		teletrabajo = dias_teletrabajo(self)
		# Días tocados: los de las horas que cambian y los de teletrabajo que se marcan o desmarcan
		dias_cambiados = {f for _, _, f in cambiadas} | (teletrabajo ^ dias_teletrabajo(antes))

		if frappe.flags.in_patch:
			return
		self.validar_dias_editables(dias_cambiados)
		self.validar_proyectos(cambiadas, ahora)
		self.validar_maximo_diario(dias_cambiados, ahora)
		self.validar_teletrabajo(dias_cambiados & teletrabajo, ahora)

	# --- Fase 1: dejar los datos en forma ---

	def normalizar(self):
		"""Horas en medias horas, de lunes a viernes de esta semana, sin ceros ni repetidas; teletrabajo
		sin días repetidos. Todo ordenado."""
		dias = set(dias_de_semana(self.semana))

		valores = {}
		for l in self.lineas:
			h = flt(l.horas)
			if h < 0:
				frappe.throw("Las horas no pueden ser negativas.")
			if abs(h * 2 - round(h * 2)) > 1e-9:
				frappe.throw(f"Las horas van en medias horas (0,5 · 1 · 1,5…): {horas(h)} no es válido.")
			if l.concepto == CONCEPTO_PROYECTO and not l.proyecto:
				frappe.throw("Falta el proyecto en una de las horas imputadas.")
			if not l.fecha or getdate(l.fecha) not in dias:
				frappe.throw(f"{l.proyecto or l.concepto}: el día {l.fecha or '(vacío)'} no es de esta semana.")
			if not h:
				continue
			k = clave(l)
			if k in valores:
				frappe.throw(f"Hay horas repetidas en {l.proyecto or l.concepto} el {dia(k[2])}.")
			valores[k] = h

		teletrabajo = set()
		for t in self.teletrabajo:
			if not t.fecha or getdate(t.fecha) not in dias:
				frappe.throw(f"El día de teletrabajo {t.fecha or '(vacío)'} no es de esta semana.")
			teletrabajo.add(getdate(t.fecha))

		self.set(
			"lineas",
			[
				{"concepto": c, "proyecto": p, "fecha": f, "horas": h}
				for (c, p, f), h in sorted(valores.items(), key=lambda x: (x[0][2], x[0][0], x[0][1] or ""))
			],
		)
		self.set("teletrabajo", [{"fecha": f} for f in sorted(teletrabajo)])

	# --- Fase 2: reglas (solo sobre lo que cambia) ---

	def validar_dias_editables(self, dias_cambiados):
		bloqueados = sorted(dias_cambiados - dias_editables(self.empleado, self.semana))
		if bloqueados:
			frappe.throw(
				f"No se puede imputar el {', '.join(dia(d) for d in bloqueados)}. Solo se imputan días que ya "
				"han llegado, de semanas sin cerrar (hasta el martes siguiente a las 00:00), que no sean "
				"festivo ni vacaciones."
			)

	def validar_proyectos(self, cambiadas, ahora):
		"""Los proyectos con horas nuevas o cambiadas: los planificados para esta persona esta semana o
		cualquier proyecto aceptado o en curso que no sea acuerdo marco."""
		planificados = planificado_de(self.empleado, self.semana)["proyectos"]
		proyectos = {p for c, p, f in cambiadas if c == CONCEPTO_PROYECTO and ahora.get((c, p, f))}
		for proyecto in sorted(proyectos):
			if proyecto not in planificados and not es_planificable(proyecto):
				frappe.throw(
					f"No se pueden imputar horas a {proyecto}: no está planificado para ti esta semana "
					"y no está aceptado ni en curso."
				)

	def validar_maximo_diario(self, dias_cambiados, ahora):
		por_dia = {}
		for (_, _, fecha), h in ahora.items():
			por_dia[fecha] = por_dia.get(fecha, 0) + h
		excedidos = [f for f in sorted(dias_cambiados) if por_dia.get(f, 0) > MAXIMO_DIARIO + 1e-9]
		if excedidos:
			frappe.throw(
				"\n".join(f"El {dia(f)} suma {horas(por_dia[f])} h: el máximo es {MAXIMO_DIARIO} h al día." for f in excedidos)
			)

	def validar_teletrabajo(self, dias, ahora):
		"""El teletrabajo solo se marca en días con horas imputadas (festivos y vacaciones ya los
		descarta validar_dias_editables)."""
		con_horas = {f for (_, _, f), h in ahora.items() if h}
		sin_horas = sorted(dias - con_horas)
		if sin_horas:
			frappe.throw(
				f"El {', '.join(dia(d) for d in sin_horas)} está marcado como teletrabajo pero no tiene horas imputadas."
			)

	# --- Después de guardar o borrar ---

	def proyectos_con_horas(self, doc):
		return [l.proyecto for l in (doc.lineas if doc else []) if l.concepto == CONCEPTO_PROYECTO]

	def anios(self):
		return {d.year for d in dias_de_semana(self.semana)}

	def on_update(self):
		recalcular_horas_imputadas(
			self.proyectos_con_horas(self) + self.proyectos_con_horas(self.get_doc_before_save())
		)
		recalcular_teletrabajo(self.empleado, self.anios())

	def after_delete(self):
		recalcular_horas_imputadas(self.proyectos_con_horas(self))
		recalcular_teletrabajo(self.empleado, self.anios())