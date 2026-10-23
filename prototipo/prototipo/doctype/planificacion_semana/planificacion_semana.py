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

# Las vacaciones van por día, son de jornada completa y solo las edita Administración
CONCEPTO_VACACIONES = "Vacaciones"

# Filas fijas de una casilla por persona y semana, como los proyectos; las edita cualquier rol de gestión
CONCEPTOS_SEMANALES = ("Comercial", "Interno", "Formación")

# Todas las filas fijas, en el orden en que salen en la tabla (debajo de los proyectos)
CONCEPTOS = (*CONCEPTOS_SEMANALES, CONCEPTO_VACACIONES)

# Estados en los que un proyecto se puede añadir a la planificación (los acuerdos marco nunca:
# se planifican sus contratos basados)
ESTADOS_PLANIFICABLES = ("Aceptado", "En curso")

# Longitud máxima del comentario de una celda (indicaciones para quien hace el trabajo)
LONGITUD_MAXIMA_COMENTARIO = 500


def clave(asignacion):
	"""Identifica una celda: (concepto, proyecto, empleado, fecha). El proyecto solo en las filas de
	proyecto; la fecha solo en vacaciones, que van por día. Todo lo demás es por semana."""
	proyecto = asignacion.proyecto if asignacion.concepto == CONCEPTO_PROYECTO else None
	fecha = None
	if asignacion.concepto == CONCEPTO_VACACIONES and asignacion.fecha:
		fecha = getdate(asignacion.fecha)
	return (asignacion.concepto, proyecto, asignacion.empleado, fecha)


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
		self.validar_vacaciones(cambiadas, ahora)
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
		comentarios = {}
		for a in self.asignaciones:
			h = flt(a.horas)
			comentario = (a.comentario or "").strip()
			if comentario:
				if a.concepto == CONCEPTO_VACACIONES:
					frappe.throw("Las vacaciones no llevan comentario.")
				if len(comentario) > LONGITUD_MAXIMA_COMENTARIO:
					frappe.throw(
						f"El comentario de {a.proyecto or a.concepto} ({a.empleado}) supera los "
						f"{LONGITUD_MAXIMA_COMENTARIO} caracteres."
					)
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
			elif a.concepto == CONCEPTO_VACACIONES:
				# Las vacaciones van por día: de lunes a viernes de esta semana y nunca en festivo
				a.proyecto = None
				if h:
					if not a.fecha:
						frappe.throw(f"Falta el día en las vacaciones de {a.empleado}.")
					if getdate(a.fecha) not in dias:
						frappe.throw(f"Vacaciones de {a.empleado}: el {a.fecha} no es un día de esta semana.")
					if getdate(a.fecha) in festivos:
						frappe.throw(f"Vacaciones de {a.empleado}: el {a.fecha} es festivo.")
			else:
				# Formación, comercial e interno: una casilla por semana
				a.proyecto = None
				a.fecha = None

			if not h:
				if comentario:
					frappe.throw(
						f"{a.proyecto or a.concepto} ({a.empleado}) tiene un comentario: no se pueden dejar sus "
						"horas a 0. Borra antes el comentario."
					)
				continue
			k = clave(a)
			if k in valores:
				frappe.throw(f"Hay horas repetidas para {a.empleado} en {a.proyecto or a.concepto}.")
			valores[k] = h
			if comentario:
				comentarios[k] = comentario

		self.set("proyectos", [{"proyecto": p} for p in filas])
		self.set(
			"asignaciones",
			[
				{"concepto": c, "proyecto": p, "empleado": e, "fecha": f, "horas": h, "comentario": comentarios.get((c, p, e, f))}
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

	def validar_vacaciones(self, cambiadas, ahora):
		"""Solo Administración cambia las vacaciones, y cada día de vacaciones vale la jornada diaria
		completa (horas semanales / 5)."""
		dias_afectados = {(e, f) for c, _, e, f in cambiadas if c == CONCEPTO_VACACIONES}
		if not dias_afectados:
			return
		if not tiene_rol(ROL_ADMINISTRACION):
			frappe.throw("Solo Administración puede modificar las vacaciones.")

		equipo = {e["usuario"]: e for e in plantilla()}
		errores = []
		for empleado, fecha in sorted(dias_afectados):
			h = ahora.get((CONCEPTO_VACACIONES, None, empleado, fecha))
			if not h or empleado not in equipo:
				continue
			jornada = jornada_diaria(equipo[empleado]["horas_semanales"])
			if abs(h - jornada) > 1e-9:
				errores.append(
					f"{equipo[empleado]['nombre']}: las vacaciones del {fecha.strftime('%d/%m')} deben ser de "
					f"jornada completa ({horas(jornada)} h)."
				)

		if errores:
			frappe.throw("\n".join(errores), title="Vacaciones")

	def validar_maximos(self, cambiadas, ahora):
		"""El total de cada persona (proyectos, vacaciones, formación, comercial e interno) no puede
		superar sus horas semanales, reducidas en proporción a los festivos de la semana."""
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