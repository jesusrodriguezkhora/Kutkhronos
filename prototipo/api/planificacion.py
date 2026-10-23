from datetime import date, timedelta

import frappe
from frappe.utils import flt, get_fullname, getdate, today

from prototipo.planificacion.festivos import festivos_detalle, nombre_lista
from prototipo.planificacion.semanas import (
	DIAS_SEMANA,
	dias_de_semana,
	es_pasada,
	horas_maximas,
	jornada_diaria,
	lunes_de,
	plantilla,
)
from prototipo.prototipo.doctype.planificacion_semana.planificacion_semana import (
	CONCEPTO_PROYECTO,
	CONCEPTOS,
	ESTADOS_PLANIFICABLES,
)
from prototipo.roles import ROL_ADMINISTRACION, ROLES_GESTION, exigir_rol, tiene_rol

MESES = (
	"enero", "febrero", "marzo", "abril", "mayo", "junio",
	"julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
)

NOMBRES_DIA = ("lunes", "martes", "miércoles", "jueves", "viernes")

# Proyectos que se pueden añadir a una semana (mismas reglas que el controlador)
FILTRO_PLANIFICABLES = {"estado": ["in", ESTADOS_PLANIFICABLES], "tipo": ["!=", "Acuerdo marco"]}


# --- Utilidades ---------------------------------------------------------------

def comprobar_lunes(lunes):
	try:
		lunes = getdate(lunes)
	except Exception:  # noqa: BLE001
		lunes = None
	if not lunes or lunes.weekday() != 0:
		frappe.throw("La semana debe indicarse con la fecha de su lunes.")
	return lunes


def etiqueta(lunes):
	"""'Semana del 19 al 23 de octubre' o 'Semana del 29 de septiembre al 3 de octubre'."""
	viernes = lunes + timedelta(days=DIAS_SEMANA - 1)
	if lunes.month == viernes.month:
		return f"Semana del {lunes.day} al {viernes.day} de {MESES[viernes.month - 1]}"
	return f"Semana del {lunes.day} de {MESES[lunes.month - 1]} al {viernes.day} de {MESES[viernes.month - 1]}"


def info_semana(lunes):
	dias = dias_de_semana(lunes)
	festivos = festivos_detalle(dias[0], dias[-1])
	nombres_festivos = {f["fecha"]: f["descripcion"] for f in festivos}
	return {
		"lunes": lunes,
		"viernes": dias[-1],
		"etiqueta": etiqueta(lunes),
		"festivos": festivos,
		# Los cinco días, para el detalle diario de vacaciones y formación
		"dias": [
			{"fecha": d, "nombre": NOMBRES_DIA[i], "festivo": nombres_festivos.get(d)}
			for i, d in enumerate(dias)
		],
		"dias_laborables": DIAS_SEMANA - len(festivos),
		"editable": not es_pasada(lunes),
		# Años de la semana sin calendario de festivos importado (el máximo no tendría en cuenta festivos)
		"sin_calendario": sorted(
			a for a in {dias[0].year, dias[-1].year} if not frappe.db.exists("Holiday List", nombre_lista(a))
		),
	}


def planificacion_de(lunes):
	nombre = frappe.db.get_value("Planificacion Semana", {"semana": lunes})
	return frappe.get_doc("Planificacion Semana", nombre) if nombre else None


def datos_proyectos(nombres):
	"""Datos para mostrar las filas de proyecto, en el orden recibido."""
	if not nombres:
		return []
	datos = {
		p.name: p
		for p in frappe.get_all(
			"Proyecto",
			filters={"name": ["in", nombres]},
			fields=["name", "descripcion", "cliente", "estado", "tipo"],
		)
	}
	return [datos[n] for n in nombres if n in datos]


def celdas_de(doc, filtro=None):
	return [
		{
			"concepto": a.concepto,
			"proyecto": a.proyecto,
			"empleado": a.empleado,
			"fecha": a.fecha,
			"horas": flt(a.horas),
			"comentario": a.comentario or None,
		}
		for a in (doc.asignaciones if doc else [])
		if not filtro or filtro(a)
	]


# --- Endpoints ----------------------------------------------------------------

@frappe.whitelist()
def semanas_del_mes(anio, mes):
	"""Semanas de un mes: las que tienen su lunes en ese mes. Solo para los roles de gestión."""
	exigir_rol(*ROLES_GESTION)
	anio, mes = int(anio), int(mes)
	if not 1 <= mes <= 12:
		frappe.throw("Mes no válido.")

	primero = date(anio, mes, 1)
	lunes = primero + timedelta(days=(7 - primero.weekday()) % 7)
	semanas = []
	while lunes.month == mes:
		semanas.append(
			{**info_semana(lunes), "planificada": bool(frappe.db.exists("Planificacion Semana", {"semana": lunes}))}
		)
		lunes += timedelta(days=7)

	return {"semanas": semanas, "semana_actual": lunes_de(today())}


@frappe.whitelist()
def obtener_semana(lunes):
	"""Todo lo necesario para pintar la tabla de una semana. Solo para los roles de gestión."""
	exigir_rol(*ROLES_GESTION)
	lunes = comprobar_lunes(lunes)
	info = info_semana(lunes)
	doc = planificacion_de(lunes)

	equipo = plantilla()
	empleados = [
		{
			**e,
			"maximo": horas_maximas(e["horas_semanales"], info["dias_laborables"]),
			"jornada_diaria": jornada_diaria(e["horas_semanales"]),
			"en_plantilla": True,
		}
		for e in equipo
	]
	# Quien tenga horas guardadas en la semana pero ya no esté en la plantilla (sobre todo, semanas pasadas)
	en_plantilla = {e["usuario"] for e in equipo}
	for usuario in sorted({a.empleado for a in (doc.asignaciones if doc else [])} - en_plantilla):
		empleados.append(
			{
				"usuario": usuario,
				"nombre": get_fullname(usuario),
				"horas_semanales": None,
				"maximo": None,
				"jornada_diaria": None,
				"en_plantilla": False,
			}
		)

	return {
		"semana": info,
		"empleados": empleados,
		"filas": filas_de_semana(doc, info["editable"]),
		"celdas": celdas_de(doc),
		"conceptos": CONCEPTOS,
		"puede_editar_vacaciones": tiene_rol(ROL_ADMINISTRACION),
		"hay_semana_anterior": bool(planificacion_de(lunes - timedelta(days=7))),
		"modificado": doc.modified if doc else None,
		"modificado_por": get_fullname(doc.modified_by) if doc else None,
	}


@frappe.whitelist(methods=["POST"])
def guardar_semana(lunes, filas, celdas, modificado=None):
	"""Crea o actualiza la planificación de una semana. Solo para los roles de gestión.
	filas = [código de proyecto, ...]; [{concepto, proyecto, empleado, fecha, horas, comentario}, ...]
	modificado = fecha de modificación que tenía la semana al abrirla, para no pisar a otra persona."""
	exigir_rol(*ROLES_GESTION)
	lunes = comprobar_lunes(lunes)
	filas = frappe.parse_json(filas) or []
	celdas = frappe.parse_json(celdas) or []

	doc = planificacion_de(lunes)
	if doc and str(doc.modified) != str(modificado or ""):
		frappe.throw(
			f"{get_fullname(doc.modified_by)} ha guardado esta semana mientras la editabas. "
			"Recarga la semana para ver sus cambios antes de guardar los tuyos."
		)
	if not doc:
		doc = frappe.new_doc("Planificacion Semana")
		doc.semana = lunes

	doc.set("proyectos", [{"proyecto": p} for p in filas])
	doc.set(
		"asignaciones",
		[
			{
				"concepto": c.get("concepto"),
				"proyecto": c.get("proyecto"),
				"empleado": c.get("empleado"),
				"fecha": c.get("fecha"),
				"horas": flt(c.get("horas")),
				"comentario": c.get("comentario"),
			}
			for c in celdas
		],
	)
	doc.save(ignore_permissions=True)
	return obtener_semana(lunes)


@frappe.whitelist()
def copiar_semana_anterior(lunes):
	"""Horas de proyecto de la semana anterior, para cargarlas en el editor (no guarda nada).
	Se quedan fuera los proyectos que ya no se pueden planificar y las personas que ya no están en la
	plantilla. Vacaciones y formación no se copian."""
	exigir_rol(*ROLES_GESTION)
	lunes = comprobar_lunes(lunes)
	if es_pasada(lunes):
		frappe.throw("Las semanas pasadas no se pueden modificar.")

	anterior = planificacion_de(lunes - timedelta(days=7))
	if not anterior:
		frappe.throw("La semana anterior no tiene planificación.")

	nombres = [p.proyecto for p in anterior.proyectos]
	planificables = set(
		frappe.get_all("Proyecto", filters={"name": ["in", nombres or [""]], **FILTRO_PLANIFICABLES}, pluck="name")
	)
	en_plantilla = {e["usuario"] for e in plantilla()}

	return {
		"filas": datos_proyectos([p for p in nombres if p in planificables]),
		"celdas": [
			{**c, "comentario": None}
			for c in celdas_de(
				anterior,
				lambda a: a.concepto == CONCEPTO_PROYECTO and a.proyecto in planificables and a.empleado in en_plantilla,
			)
		],
		"proyectos_omitidos": [p for p in nombres if p not in planificables],
	}


def consultar_proyectos(texto=None):
	"""Proyectos planificables (aceptados o en curso, sin acuerdos marco) que coinciden con el texto en
	código, descripción o cliente. Máximo 20. La usan los buscadores de planificación e imputación."""
	o_filtros = None
	texto = (texto or "").strip()
	if texto:
		patron = f"%{texto}%"
		o_filtros = [["name", "like", patron], ["descripcion", "like", patron], ["cliente", "like", patron]]
	return frappe.get_all(
		"Proyecto",
		filters=FILTRO_PLANIFICABLES,
		or_filters=o_filtros,
		fields=["name", "descripcion", "cliente", "estado"],
		order_by="name asc",
		limit_page_length=20,
	)


@frappe.whitelist()
def buscar_proyectos(texto=None):
	"""Buscador de proyectos para los roles de gestión."""
	exigir_rol(*ROLES_GESTION)
	return consultar_proyectos(texto)


def filas_de_semana(doc, editable):
	"""Filas de proyecto que se muestran en una semana, ordenadas por código.
	- Editable: todos los proyectos planificables (aceptados o en curso, sin acuerdos marco) más los que
	  ya tengan horas en la semana aunque hayan dejado de serlo, para no perder esas horas de vista.
	- Cerrada: solo los proyectos con horas (lo que realmente se planificó)."""
	con_horas = {a.proyecto for a in (doc.asignaciones if doc else []) if a.concepto == CONCEPTO_PROYECTO}
	nombres = set(con_horas)
	if editable:
		nombres |= set(frappe.get_all("Proyecto", filters=FILTRO_PLANIFICABLES, pluck="name"))
	return datos_proyectos(sorted(nombres))