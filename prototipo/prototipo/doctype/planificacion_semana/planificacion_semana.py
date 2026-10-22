import frappe
from frappe.model.document import Document
from frappe.utils import flt, getdate

from prototipo.planificacion.semanas import (
	dias_de_semana,
	dias_laborables,
	es_pasada,
	festivos_de_semana,
	horas_maximas,
	jornada_diaria,
	plantilla,
)
from prototipo.roles import ROL_ADMINISTRACION, tiene_rol

CONCEPTO_PROYECTO = "Proyecto"

# Filas fijas que solo puede editar Administración
CONCEPTOS_ADMINISTRACION = ("Vacaciones", "Formación")

# Las vacaciones son de día completo: sus horas son siempre la jornada diaria de la persona
CONCEPTO_VACACIONES = "Vacaciones"

# Estados en los que un proyecto se puede añadir a la planificación (los acuerdos marco nunca:
# se planifican sus contratos basados)
ESTADOS_PLANIFICABLES = ("Aceptado", "En curso")


def clave(asignacion):
	"""Identifica una celda: (concepto, proyecto, empleado, fecha). Los proyectos se planifican por
	semana (sin fecha); vacaciones y formación, por día."""
	if asignacion.concepto == CONCEPTO_PROYECTO:
		return (asignacion.concepto, asignacion.proyecto, asignacion.empleado, None)
	fecha = getdate(asignacion.fecha) if asignacion.fecha else None
	return (asignacion.concepto, None, asignacion.empleado, fecha)


def celdas(doc):
	"""{(concepto, proyecto, empleado, fecha): horas} de una planificación ({} si no hay documento)."""
	return {clave(a): flt(a.horas) for a in doc.asignaciones} if doc else {}


def horas(valor):
	"""12.0 -> "12", 7.5 -> "7,5" (para los mensajes)."""
	return f"{flt(valor):g}".replace(".", ",")


def recalcular_horas_planificadas(proyectos):
	"""Acumulado de horas planificadas de cada proyecto, en todas las semanas."""
	for proyecto in filter(None, set(proyectos)):
		if not frappe.db.exists("Proyecto", proyecto):
			continue
		total = frappe.db.sql(
			"""select coalesce(sum(horas), 0) from `tabAsignacion Planificacion`
			where parenttype = 'Planificacion Semana' and concepto = %s and proyecto = %s""",
			(CONCEPTO_PROYECTO, proyecto),
		)[0][0]
		frappe.db.set_value("Proyecto", proyecto, "horas_planificadas", flt(total), update_modified=False)


class PlanificacionSemana(Document):
	def validate(self):
		if getdate(self.semana).weekday() != 0:
			frappe.throw("La semana de una planificación debe empezar en lunes.")
		if es_pasada(self.semana) and not frappe.flags.in_patch:
			frappe.throw("Las semanas pasadas no se pueden modificar.")

		self.normalizar()

		antes = celdas(self.get_doc_before_save())
		ahora = celdas(self)
		# Solo se comprueba lo que cambia: así, dentro de la semana en curso, no bloquean el guardado
		# las celdas de alguien que haya dejado la empresa o de un proyecto que se haya cerrado
		cambiadas = {k for k in set(antes) | set(ahora) if antes.get(k) != ahora.get(k)}

		self.validar_proyectos_nuevos()
		self.validar_conceptos_administracion(cambiadas)
		self.validar_dias(cambiadas, ahora)
		self.validar_maximos(cambiadas, ahora)

	# --- Fase 1: dejar los datos en forma ---

	def normalizar(self):
		"""Filas de proyecto sin repetir y en orden; celdas en medias horas, sin ceros ni repetidas.
		Un proyecto con horas que no esté en las filas se añade al final."""
		filas = []
		for f in self.proyectos:
			if f.proyecto and f.proyecto not in filas:
				filas.append(f.proyecto)

		dias = set(dias_de_semana(self.semana))
		festivos = set(festivos_de_semana(self.semana))

		valores = {}
		for a in self.asignaciones:
			h = flt(a.horas)
			if h < 0:
				frappe.throw("Las horas no pueden ser negativas.")
			# Las vacaciones valen la jornada diaria, que no tiene por qué ser múltiplo de media hora
			if a.concepto != CONCEPTO_VACACIONES and abs(h * 2 - round(h * 2)) > 1e-9:
				frappe.throw(f"Las horas van en medias horas (0,5 · 1 · 1,5…): {horas(h)} no es válido.")

			if a.concepto == CONCEPTO_PROYECTO:
				if not a.proyecto:
					frappe.throw("Falta el proyecto en una de las horas planificadas.")
				if a.proyecto not in filas:
					filas.append(a.proyecto)
				a.fecha = None
			else:
				# Vacaciones y formación van por día: de lunes a viernes de esta semana y nunca en festivo
				a.proyecto = None
				if h:
					if not a.fecha:
						frappe.throw(f"Falta el día en las horas de {a.concepto.lower()} de {a.empleado}.")
					if getdate(a.fecha) not in dias:
						frappe.throw(f"{a.concepto} de {a.empleado}: el {a.fecha} no es un día de esta semana.")
					if getdate(a.fecha) in festivos:
						frappe.throw(f"{a.concepto} de {a.empleado}: el {a.fecha} es festivo.")

			if not h:
				continue
			k = clave(a)
			if k in valores:
				frappe.throw(f"Hay horas repetidas para {a.empleado} en {a.proyecto or a.concepto}.")
			valores[k] = h

		self.set("proyectos", [{"proyecto": p} for p in filas])
		self.set(
			"asignaciones",
			[
				{"concepto": c, "proyecto": p, "empleado": e, "fecha": f, "horas": h}
				for (c, p, e, f), h in valores.items()
			],
		)

	# --- Fase 2: reglas ---

	def validar_proyectos_nuevos(self):
		"""Las filas de proyecto que se añaden: proyectos aceptados o en curso, nunca acuerdos marco."""
		antes = self.get_doc_before_save()
		previos = {f.proyecto for f in antes.proyectos} if antes else set()

		for fila in self.proyectos:
			if fila.proyecto in previos:
				continue
			datos = frappe.db.get_value("Proyecto", fila.proyecto, ["tipo", "estado"], as_dict=True)
			if not datos:
				frappe.throw(f"El proyecto {fila.proyecto} no existe.")
			if datos.tipo == "Acuerdo marco":
				frappe.throw(
					f"{fila.proyecto} es un acuerdo marco: se planifican sus contratos basados, no el acuerdo."
				)
			if datos.estado not in ESTADOS_PLANIFICABLES:
				frappe.throw(
					f"{fila.proyecto} está en estado {datos.estado or 'sin estado'}: solo se pueden "
					f"planificar proyectos {' o '.join(e.lower() for e in ESTADOS_PLANIFICABLES)}."
				)

	def validar_conceptos_administracion(self, cambiadas):
		if any(c in CONCEPTOS_ADMINISTRACION for c, *_ in cambiadas) and not tiene_rol(ROL_ADMINISTRACION):
			frappe.throw("Solo Administración puede modificar las horas de vacaciones y formación.")

	def validar_dias(self, cambiadas, ahora):
		"""En los días que cambian: no puede haber vacaciones y formación el mismo día, las vacaciones son
		de jornada completa y la formación no puede superar la jornada diaria (horas semanales / 5)."""
		dias_afectados = {(e, f) for c, _, e, f in cambiadas if c in CONCEPTOS_ADMINISTRACION}
		if not dias_afectados:
			return

		equipo = {e["usuario"]: e for e in plantilla()}
		por_dia = {}
		for (concepto, _, empleado, fecha), h in ahora.items():
			if concepto in CONCEPTOS_ADMINISTRACION:
				por_dia.setdefault((empleado, fecha), {})[concepto] = h

		errores = []
		for empleado, fecha in sorted(dias_afectados):
			conceptos = por_dia.get((empleado, fecha), {})
			nombre = equipo[empleado]["nombre"] if empleado in equipo else empleado
			dia = fecha.strftime("%d/%m")
			if len(conceptos) > 1:
				errores.append(f"{nombre}: el {dia} tiene vacaciones y formación a la vez.")
			if empleado in equipo:
				jornada = jornada_diaria(equipo[empleado]["horas_semanales"])
				vacaciones = conceptos.get(CONCEPTO_VACACIONES)
				if vacaciones and abs(vacaciones - jornada) > 1e-9:
					errores.append(
						f"{nombre}: las vacaciones del {dia} deben ser de jornada completa ({horas(jornada)} h)."
					)
				total = sum(conceptos.values())
				if total > jornada + 1e-9:
					errores.append(
						f"{nombre}: {horas(total)} h de {' y '.join(c.lower() for c in conceptos)} el {dia}, "
						f"más que su jornada diaria ({horas(jornada)} h)."
					)

		if errores:
			frappe.throw("\n".join(errores), title="Vacaciones y formación")

	def validar_maximos(self, cambiadas, ahora):
		"""El total de cada persona (proyectos + vacaciones + formación) no puede superar sus horas
		semanales, reducidas en proporción a los festivos de la semana."""
		afectados = {e for _, _, e, _ in cambiadas}
		if not afectados:
			return

		equipo = {e["usuario"]: e for e in plantilla()}
		laborables = dias_laborables(self.semana)
		totales = {}
		for (_, _, empleado, _), h in ahora.items():
			totales[empleado] = totales.get(empleado, 0) + h

		errores = []
		for empleado in sorted(afectados):
			total = totales.get(empleado, 0)
			if empleado not in equipo:
				if total:
					errores.append(f"{empleado} no está en la plantilla (o no tiene horas semanales).")
				continue
			maximo = horas_maximas(equipo[empleado]["horas_semanales"], laborables)
			if total > maximo + 1e-9:
				errores.append(
					f"{equipo[empleado]['nombre']}: {horas(total)} h planificadas, "
					f"máximo {horas(maximo)} h esta semana."
				)

		if errores:
			frappe.throw("\n".join(errores), title="Horas por encima del máximo")

	# --- Después de guardar o borrar ---

	def proyectos_con_horas(self, doc):
		return [a.proyecto for a in (doc.asignaciones if doc else []) if a.concepto == CONCEPTO_PROYECTO]

	def on_update(self):
		recalcular_horas_planificadas(
			self.proyectos_con_horas(self) + self.proyectos_con_horas(self.get_doc_before_save())
		)

	def on_trash(self):
		if es_pasada(self.semana) and not frappe.flags.in_patch:
			frappe.throw("Las semanas pasadas no se pueden borrar.")

	def after_delete(self):
		recalcular_horas_planificadas(self.proyectos_con_horas(self))