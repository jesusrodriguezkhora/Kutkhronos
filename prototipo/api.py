import frappe
from frappe.utils import flt

CAMPOS = [
	"name",
	"creation",
	"cliente",
	"tipo",
	"via",
	"importe",
	"estado",
	"importe_consumido",
	"importe_disponible",
	"acuerdo_marco",
]

# Filtros que aceptamos por igualdad exacta
FILTROS_EXACTOS = ("cliente", "tipo", "via", "estado")


def construir_condiciones(filtros):
	"""Traduce los filtros recibidos a condiciones de Frappe, solo con campos permitidos."""
	condiciones = []
	for campo in FILTROS_EXACTOS:
		if filtros.get(campo):
			condiciones.append([campo, "=", filtros[campo]])
	if filtros.get("importe_min") not in (None, ""):
		condiciones.append(["importe", ">=", flt(filtros["importe_min"])])
	if filtros.get("importe_max") not in (None, ""):
		condiciones.append(["importe", "<=", flt(filtros["importe_max"])])
	return condiciones


def listar(condiciones, order_by="creation desc"):
	return frappe.get_list(
		"Proyecto",
		fields=CAMPOS,
		filters=condiciones,
		order_by=order_by,
		limit_page_length=0,
	)


@frappe.whitelist()
def obtener_proyectos(filtros=None):
	"""Proyectos principales con sus subcontratos, aplicando las reglas de filtrado jerárquico."""
	filtros = frappe.parse_json(filtros) or {}
	condiciones = construir_condiciones(filtros)

	# 1. Proyectos principales que cumplen el filtro
	principales = listar([["acuerdo_marco", "is", "not set"], *condiciones])
	for p in principales:
		p["cumple_filtro"] = True

	# 2. Subcontratos que cumplen el filtro, de cualquier acuerdo
	subs_que_cumplen = listar([["acuerdo_marco", "is", "set"], *condiciones])
	nombres_que_cumplen = {s.name for s in subs_que_cumplen}

	# 3. Acuerdos que solo aparecen como contexto de algún subcontrato que cumple
	presentes = {p.name for p in principales}
	acuerdos_contexto = {s.acuerdo_marco for s in subs_que_cumplen} - presentes
	if acuerdos_contexto:
		for p in listar([["name", "in", list(acuerdos_contexto)]]):
			p["cumple_filtro"] = False
			principales.append(p)

	# 4. Todos los subcontratos de los acuerdos que se van a mostrar
	ids_acuerdos = [p.name for p in principales if p.tipo == "Acuerdo marco"]
	por_acuerdo = {}
	if ids_acuerdos:
		for s in listar([["acuerdo_marco", "in", ids_acuerdos]], order_by="name asc"):
			s["cumple_filtro"] = s.name in nombres_que_cumplen
			por_acuerdo.setdefault(s.acuerdo_marco, []).append(s)

	for p in principales:
		if p.tipo == "Acuerdo marco":
			subs = por_acuerdo.get(p.name, [])
			# Si el acuerdo solo está como contexto, mostramos únicamente los que cumplen
			p["subcontratos"] = subs if p.cumple_filtro else [s for s in subs if s.cumple_filtro]

	principales.sort(key=lambda p: p.creation, reverse=True)
	return principales