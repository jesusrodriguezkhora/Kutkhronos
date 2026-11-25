import frappe
from frappe.utils import cint, flt, getdate, nowdate

from prototipo.prototipo.doctype.proyecto.proyecto import ESTADOS_COMPUTABLES
from prototipo.roles import ROLES_GESTION, exigir_rol

CAMPOS = [
	"name",
	"creation",
	"fecha_alta",
	"cliente",
	"tipo",
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
	"facturacion",
	"canarias",
	"motivo_rechazo",
	"duracion",
	"unidad_duracion",
]

# Filtros que aceptamos por igualdad exacta
FILTROS_EXACTOS = ("cliente", "tipo", "estado")
# Valor del filtro de responsable para los proyectos que no tienen ninguno
SIN_RESPONSABLE = "__sin_responsable__"


def construir_condiciones(filtros, por_anio=False):
	"""Traduce los filtros recibidos a condiciones de Frappe, solo con campos permitidos. En un año
	concreto, el importe mínimo y máximo se aplican al importe de ese año (en obtener_proyectos)."""
	condiciones = []
	for campo in FILTROS_EXACTOS:
		if filtros.get(campo):
			condiciones.append([campo, "=", filtros[campo]])
	if not por_anio and filtros.get("importe_min") not in (None, ""):
		condiciones.append(["importe", ">=", flt(filtros["importe_min"])])
	if not por_anio and filtros.get("importe_max") not in (None, ""):
		condiciones.append(["importe", "<=", flt(filtros["importe_max"])])
	responsable = filtros.get("responsable")
	if responsable == SIN_RESPONSABLE:
		condiciones.append(["responsable", "is", "not set"])
	elif responsable:
		condiciones.append(["responsable", "=", responsable])
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

def anadir_importes_anuales(proyectos):
	"""Añade importes_anuales ([{anio, importe}], por año) a cada proyecto, en una sola consulta."""
	nombres = [p.name for p in proyectos]
	por_proyecto = {}
	for f in frappe.get_all(
		"Importe Anual",
		filters={"parenttype": "Proyecto", "parent": ["in", nombres or [""]]},
		fields=["parent", "anio", "importe"],
		order_by="anio asc",
	):
		por_proyecto.setdefault(f.parent, []).append({"anio": f.anio, "importe": f.importe})
	for p in proyectos:
		p["importes_anuales"] = por_proyecto.get(p.name, [])

def importes_del_anio(anio):
	"""{proyecto: importe de ese año} de todos los proyectos con importe en ese año."""
	return {
		f.parent: flt(f.importe)
		for f in frappe.get_all(
			"Importe Anual", filters={"parenttype": "Proyecto", "anio": anio}, fields=["parent", "importe"]
		)
	}


def en_rango(valor, minimo, maximo):
	return (minimo in (None, "") or valor >= flt(minimo)) and (maximo in (None, "") or valor <= flt(maximo))


def anadir_importes_del_anio(proyectos, principales, del_anio):
	"""Importe del año de cada proyecto y, en los acuerdos marco, su disponible en ese año: importe del
	acuerdo ese año menos lo que tienen ese año sus contratos basados computables."""
	for p in proyectos:
		p["importe_anio"] = del_anio.get(p.name, 0)

	acuerdos = [p.name for p in principales if p.tipo == "Acuerdo marco"]
	consumido = {}
	if acuerdos:
		for c in frappe.get_all(
			"Proyecto",
			filters={"acuerdo_marco": ["in", acuerdos], "estado": ["in", ESTADOS_COMPUTABLES]},
			fields=["name", "acuerdo_marco"],
		):
			consumido[c.acuerdo_marco] = consumido.get(c.acuerdo_marco, 0) + del_anio.get(c.name, 0)
	for p in principales:
		if p.tipo == "Acuerdo marco":
			p["disponible_anio"] = flt(p["importe_anio"] - consumido.get(p.name, 0), 2)


@frappe.whitelist()
def anios_pipeline():
	"""Años con algún importe registrado, más el actual, para el selector del Pipeline."""
	exigir_rol(*ROLES_GESTION)
	anios = set(frappe.get_all("Importe Anual", filters={"parenttype": "Proyecto"}, pluck="anio", distinct=True))
	anios.add(getdate(nowdate()).year)
	return sorted(cint(a) for a in anios)

@frappe.whitelist()
def obtener_proyectos(filtros=None):
	"""Proyectos principales con sus contratos basados, aplicando las reglas de filtrado jerárquico."""
	filtros = frappe.parse_json(filtros) or {}
	# Año del Pipeline (sin año: "Total", importes completos)
	anio = cint(filtros.get("anio")) or None
	condiciones = construir_condiciones(filtros, por_anio=bool(anio))
	busqueda = condiciones_busqueda(filtros)

	# En un año concreto, solo los proyectos con importe ese año (y, si se pide, dentro del rango)
	del_anio = {}
	if anio:
		del_anio = importes_del_anio(anio)
		candidatos = [
			p for p, importe in del_anio.items()
			if en_rango(importe, filtros.get("importe_min"), filtros.get("importe_max"))
		]
		condiciones.append(["name", "in", candidatos or [""]])

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
			if anio and c.name not in del_anio:
				continue  # en un año concreto, solo los basados con importe ese año
			c["cumple_filtro"] = c.name in nombres_que_cumplen
			por_acuerdo.setdefault(c.acuerdo_marco, []).append(c)

	for p in principales:
		if p.tipo == "Acuerdo marco":
			basados = por_acuerdo.get(p.name, [])
			# Si el acuerdo solo está como contexto, mostramos únicamente los que cumplen
			p["contratos_basados"] = basados if p.cumple_filtro else [c for c in basados if c.cumple_filtro]

	todos = principales + [c for p in principales for c in p.get("contratos_basados", [])]
	anadir_nombre_responsable(todos)
	anadir_importes_anuales(todos)

	if anio:
		anadir_importes_del_anio(todos, principales, del_anio)

	principales.sort(key=lambda p: p.creation, reverse=True)

	return principales


@frappe.whitelist(methods=["POST"])
def eliminar_proyecto(proyecto, confirmacion=None):
	"""Borra un proyecto. Solo para los roles de gestión (y con el permiso de borrar Proyecto).
	Hay que confirmar escribiendo su código (`confirmacion`), sin distinguir mayúsculas."""
	exigir_rol(*ROLES_GESTION)

	if (confirmacion or "").strip().upper() != (proyecto or "").strip().upper():
		frappe.throw("Para eliminar el proyecto, escribe su código exactamente.")

	if not frappe.db.exists("Proyecto", proyecto):
		frappe.throw("El proyecto no existe.")
	basados = frappe.db.count("Proyecto", {"acuerdo_marco": proyecto})
	if basados:
		frappe.throw(
			f"Este acuerdo marco tiene {basados} "
			f"{'contrato basado' if basados == 1 else 'contratos basados'}. Elimínalos antes."
		)

	frappe.delete_doc("Proyecto", proyecto)
