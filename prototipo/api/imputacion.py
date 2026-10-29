from datetime import date, timedelta

import frappe
from frappe.utils import flt, today

from prototipo.api.planificacion import (
	NOMBRES_DIA,
	comprobar_lunes,
	consultar_proyectos,
	datos_proyectos,
	etiqueta,
)
from prototipo.imputacion.reglas import (
	CONCEPTO_PROYECTO,
	CONCEPTOS_IMPUTABLES,
	cierre,
	dias_editables,
	esta_cerrada,
	planificado_de,
)
from prototipo.planificacion.festivos import festivos_detalle
from prototipo.planificacion.semanas import dias_de_semana, lunes_de
from prototipo.roles import ROL_EMPLEADO, ROLES_GESTION, exigir_rol, tiene_rol

# Todo es siempre de la persona de la sesión: no hay forma de pedir la imputación de otra


def imputacion_de(empleado, lunes):
	nombre = frappe.db.get_value("Imputacion Semana", {"empleado": empleado, "semana": lunes})
	return frappe.get_doc("Imputacion Semana", nombre) if nombre else None


# --- Endpoints ----------------------------------------------------------------

@frappe.whitelist()
def semanas_del_mes(anio, mes):
	"""Semanas de un mes (las que tienen su lunes en él), con si se pueden imputar todavía.
	Para quien imputa y, para la supervisión, para los roles de gestión."""
	exigir_rol(ROL_EMPLEADO, *ROLES_GESTION)
	empleado = frappe.session.user
	# CEO y Administración no imputan: ninguna semana es editable para ellos
	imputa = tiene_rol(ROL_EMPLEADO)
	anio, mes = int(anio), int(mes)
	if not 1 <= mes <= 12:
		frappe.throw("Mes no válido.")

	primero = date(anio, mes, 1)
	lunes = primero + timedelta(days=(7 - primero.weekday()) % 7)
	semanas = []
	while lunes.month == mes:
		dias = dias_de_semana(lunes)
		semanas.append(
			{
				"lunes": lunes,
				"etiqueta": etiqueta(lunes),
				"festivos": festivos_detalle(dias[0], dias[-1]),
				"editable": imputa and bool(dias_editables(empleado, lunes)),
				"imputada": imputa and bool(frappe.db.exists("Imputacion Semana", {"empleado": empleado, "semana": lunes})),
			}
		)
		lunes += timedelta(days=7)

	return {"semanas": semanas, "semana_actual": lunes_de(today())}


@frappe.whitelist()
def obtener_semana(lunes):
	"""Todo lo necesario para pintar la imputación de una semana de la persona de la sesión."""
	exigir_rol(ROL_EMPLEADO)
	empleado = frappe.session.user
	lunes = comprobar_lunes(lunes)
	doc = imputacion_de(empleado, lunes)
	plan = planificado_de(empleado, lunes)
	editables = dias_editables(empleado, lunes)

	dias = dias_de_semana(lunes)
	festivos = festivos_detalle(dias[0], dias[-1])
	nombres_festivos = {f["fecha"]: f["descripcion"] for f in festivos}

	# Proyectos: los planificados para esta persona esta semana y los que ya haya imputado
	imputados = {l.proyecto for l in (doc.lineas if doc else []) if l.concepto == CONCEPTO_PROYECTO}
	filas = [
		{**p, "planificado": plan["proyectos"].get(p.name, 0), "comentario": plan["comentarios"].get(p.name)}
		for p in datos_proyectos(sorted(set(plan["proyectos"]) | imputados))
	]

	return {
		"semana": {
			"lunes": lunes,
			"viernes": dias[-1],
			"etiqueta": etiqueta(lunes),
			"festivos": festivos,
			"dias": [
				{
					"fecha": d,
					"nombre": NOMBRES_DIA[i],
					"festivo": nombres_festivos.get(d),
					"vacaciones": plan["vacaciones"].get(d, 0),
					"editable": d in editables,
				}
				for i, d in enumerate(dias)
			],
			"editable": bool(editables),
			"cerrada": esta_cerrada(lunes),
			"cierre": cierre(lunes),
		},
		"filas": filas,
		# Filas fijas (salen siempre), con lo planificado
		"conceptos": [
			{"concepto": c, "planificado": plan["conceptos"].get(c, 0), "comentario": plan["comentarios"].get(c)}
			for c in CONCEPTOS_IMPUTABLES
		],
		"celdas": [
			{"concepto": l.concepto, "proyecto": l.proyecto, "fecha": l.fecha, "horas": flt(l.horas)}
			for l in (doc.lineas if doc else [])
		],
		"teletrabajo": [t.fecha for t in (doc.teletrabajo if doc else [])],
	}


@frappe.whitelist(methods=["POST"])
def guardar_semana(lunes, celdas, teletrabajo):
	"""Guarda la imputación de una semana de la persona de la sesión.
	celdas = [{concepto, proyecto, fecha, horas}, ...]; teletrabajo = ["AAAA-MM-DD", ...]
	Las reglas (días editables, medias horas, 24 h, teletrabajo) las comprueba el controlador."""
	exigir_rol(ROL_EMPLEADO)
	empleado = frappe.session.user
	lunes = comprobar_lunes(lunes)
	celdas = frappe.parse_json(celdas) or []
	teletrabajo = frappe.parse_json(teletrabajo) or []

	doc = imputacion_de(empleado, lunes)
	if not doc:
		if not celdas and not teletrabajo:
			return obtener_semana(lunes)
		doc = frappe.new_doc("Imputacion Semana")
		doc.empleado = empleado
		doc.semana = lunes

	doc.set(
		"lineas",
		[
			{
				"concepto": c.get("concepto"),
				"proyecto": c.get("proyecto"),
				"fecha": c.get("fecha"),
				"horas": flt(c.get("horas")),
			}
			for c in celdas
		],
	)
	doc.set("teletrabajo", [{"fecha": f} for f in teletrabajo])
	doc.save(ignore_permissions=True)
	return obtener_semana(lunes)


@frappe.whitelist()
def buscar_proyectos(texto=None):
	"""Buscador de "Añadir proyecto" de la imputación: los mismos proyectos que en planificación."""
	exigir_rol(ROL_EMPLEADO)
	return consultar_proyectos(texto)