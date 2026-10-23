import frappe
from frappe.utils import flt

from prototipo.roles import ROLES_GESTION, exigir_rol

CAMPOS = [
	"name",
	"creation",
	"fecha_alta",
	"cliente",
	"tipo",
	"via",
	"importe",
	"estado",
	"importe_consumido",
	"importe_disponible",
	"acuerdo_marco",
	"descripcion",
	"fecha_inicio",
	"fecha_fin",
	"responsable",
	"lider_proyecto",
	"miembros_consorcio",
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


def condiciones_busqueda(filtros):
	"""Búsqueda de texto libre: el proyecto cumple si el texto aparece en la descripción, el código
	o el cliente. Son condiciones "o" (or_filters). La comparación de la base de datos ya ignora
	mayúsculas y tildes."""
	texto = (filtros.get("busqueda") or "").strip()
	if not texto:
		return None
	patron = f"%{texto}%"
	return [["descripcion", "like", patron], ["name", "like", patron], ["cliente", "like", patron]]


def listar(condiciones, o_condiciones=None, order_by="creation desc"):
	return frappe.get_list(
		"Proyecto",
		fields=CAMPOS,
		filters=condiciones,
		or_filters=o_condiciones,
		order_by=order_by,
		limit_page_length=0,
	)

def anadir_nombre_responsable(proyectos):
	"""Añade responsable_nombre (nombre completo del usuario) para que la SPA no muestre el email."""
	usuarios = list({p.responsable for p in proyectos if p.responsable})
	nombres = {}
	if usuarios:
		nombres = dict(
			frappe.get_all("User", filters={"name": ["in", usuarios]}, fields=["name", "full_name"], as_list=True)
		)
	for p in proyectos:
		p["responsable_nombre"] = nombres.get(p.responsable)


@frappe.whitelist()
def obtener_proyectos(filtros=None):
	"""Proyectos principales con sus contratos basados, aplicando las reglas de filtrado jerárquico."""
	filtros = frappe.parse_json(filtros) or {}
	condiciones = construir_condiciones(filtros)
	busqueda = condiciones_busqueda(filtros)

	# 1. Proyectos principales que cumplen el filtro
	principales = listar([["acuerdo_marco", "is", "not set"], *condiciones], busqueda)
	for p in principales:
		p["cumple_filtro"] = True

	# 2. Contratos basados que cumplen el filtro, de cualquier acuerdo
	basados_que_cumplen = listar([["acuerdo_marco", "is", "set"], *condiciones], busqueda)
	nombres_que_cumplen = {c.name for c in basados_que_cumplen}

	# 3. Acuerdos que solo aparecen como contexto de algún contrato basado que cumple
	presentes = {p.name for p in principales}
	acuerdos_contexto = {c.acuerdo_marco for c in basados_que_cumplen} - presentes
	if acuerdos_contexto:
		for p in listar([["name", "in", list(acuerdos_contexto)]]):
			p["cumple_filtro"] = False
			principales.append(p)

	# 4. Todos los contratos basados de los acuerdos que se van a mostrar
	ids_acuerdos = [p.name for p in principales if p.tipo == "Acuerdo marco"]
	por_acuerdo = {}
	if ids_acuerdos:
		for c in listar([["acuerdo_marco", "in", ids_acuerdos]], order_by="name asc"):
			c["cumple_filtro"] = c.name in nombres_que_cumplen
			por_acuerdo.setdefault(c.acuerdo_marco, []).append(c)

	for p in principales:
		if p.tipo == "Acuerdo marco":
			basados = por_acuerdo.get(p.name, [])
			# Si el acuerdo solo está como contexto, mostramos únicamente los que cumplen
			p["contratos_basados"] = basados if p.cumple_filtro else [c for c in basados if c.cumple_filtro]

	anadir_nombre_responsable(principales + [c for p in principales for c in p.get("contratos_basados", [])])

	principales.sort(key=lambda p: p.creation, reverse=True)

	return principales


@frappe.whitelist(methods=["POST"])
def eliminar_proyecto(proyecto):
	"""Borra un proyecto. Solo para los roles de gestión (y con el permiso de borrar Proyecto)."""
	exigir_rol(*ROLES_GESTION)

	if not frappe.db.exists("Proyecto", proyecto):
		frappe.throw("El proyecto no existe.")
	basados = frappe.db.count("Proyecto", {"acuerdo_marco": proyecto})
	if basados:
		frappe.throw(
			f"Este acuerdo marco tiene {basados} "
			f"{'contrato basado' if basados == 1 else 'contratos basados'}. Elimínalos antes."
		)

	frappe.delete_doc("Proyecto", proyecto)
