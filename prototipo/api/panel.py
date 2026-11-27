import frappe
from frappe.utils import cint, flt, getdate, nowdate

from prototipo.roles import ROLES_DIRECCION, ROLES_GESTION, exigir_rol, tiene_rol

# Cartera viva: proyectos aceptados
ESTADOS_VIVOS = ("Aceptado",)
# Lo conseguido en un año: lo aceptado
ESTADOS_GANADOS = ("Aceptado",)

# Columnas del pipeline, en orden
PIPELINE = ("Aceptado", "Propuesta", "Oportunidad", "Rechazado")
COLUMNA_DE_ESTADO = {"Aceptado": "Aceptado"}

# Tipos del reparto por tipo, siempre en este orden (aunque no tengan importe)
TIPOS = ("Subvención", "Acuerdo marco", "Licitación", "Contrato menor")

CAMPOS = ["name", "cliente", "tipo", "estado", "importe", "fecha_alta"]


def importes_por_anio(nombres):
	"""{proyecto: {año: importe}} de los proyectos indicados, desde su tabla Importe por año."""
	por_proyecto = {}
	if not nombres:
		return por_proyecto
	for f in frappe.get_all(
		"Importe Anual",
		filters={"parenttype": "Proyecto", "parent": ["in", nombres]},
		fields=["parent", "anio", "importe"],
	):
		anios = por_proyecto.setdefault(f.parent, {})
		anios[cint(f.anio)] = anios.get(cint(f.anio), 0) + flt(f.importe)
	return por_proyecto


def repartir_por_anio(proyectos):
	"""Añade a cada proyecto `por_anio` ({año: importe}). Sin importe por año (no tiene fechas de
	inicio y fin, algo habitual en oportunidades y propuestas), todo su importe va al año de alta."""
	tabla = importes_por_anio([p.name for p in proyectos])
	for p in proyectos:
		p.por_anio = tabla.get(p.name) or (
			{getdate(p.fecha_alta).year: flt(p.importe)} if p.fecha_alta else {}
		)


def objetivo_del_anio(anio):
	valor = frappe.db.get_value("Objetivo Anual", {"anio": anio}, "importe")
	return flt(valor) if valor is not None else None


def reparto(proyectos, anio, clave, vacio):
	"""Importe en el año y nº de proyectos agrupados por `clave(p)`, de mayor a menor importe."""
	grupos = {}
	for p in proyectos:
		importe = p.por_anio.get(anio, 0)
		if not importe:
			continue
		g = grupos.setdefault(clave(p) or vacio, {"num": 0, "importe": 0})
		g["num"] += 1
		g["importe"] += importe
	filas = [{"clave": k, **g} for k, g in grupos.items()]
	filas.sort(key=lambda f: f["importe"], reverse=True)
	return filas


@frappe.whitelist()
def obtener_panel(anio=None):
	"""Datos del panel. Solo para los roles de gestión.

	- Cartera viva (siempre del año actual): objetivo del año, importe total de los proyectos aceptados
	  (sin límite de año), importe de este año de lo aceptado (vivo o cerrado) y % sobre el objetivo.
	- Pipeline del año `anio` (por defecto, el actual): importe de ese año por estado, por cliente y por
	  tipo. Los repartos por cliente y tipo son de lo aceptado, como el importe del año.

	Los importes suman los proyectos principales, como las filas de la página Proyectos: el importe de
	los contratos basados ya está dentro del de su acuerdo marco, y sumar los dos lo contaría dos veces."""
	exigir_rol(*ROLES_GESTION)

	actual = getdate(nowdate()).year
	anio = cint(anio) or actual

	principales = frappe.get_list(
		"Proyecto", filters=[["acuerdo_marco", "is", "not set"]], fields=CAMPOS, limit_page_length=0
	)
	repartir_por_anio(principales)

	vivos = [p for p in principales if p.estado in ESTADOS_VIVOS]
	ganados = [p for p in principales if p.estado in ESTADOS_GANADOS]

	# --- Cartera viva ---
	objetivo = objetivo_del_anio(actual)
	importe_actual = sum(p.por_anio.get(actual, 0) for p in ganados)

	# --- Pipeline del año ---
	columnas = {c: {"estado": c, "num": 0, "importe": 0} for c in PIPELINE}
	for p in principales:
		columna = COLUMNA_DE_ESTADO.get(p.estado, p.estado)
		importe = p.por_anio.get(anio, 0)
		if columna in columnas and importe:
			columnas[columna]["num"] += 1
			columnas[columna]["importe"] += importe

	por_tipo = {f["clave"]: f for f in reparto(ganados, anio, lambda p: p.tipo, "Sin tipo")}

	anios = {actual}
	for p in principales:
		anios.update(p.por_anio)

	return {
		"cartera": {
			"anio": actual,
			"objetivo": objetivo,
			"importe_total": sum(flt(p.importe) for p in vivos),
			"num_total": len(vivos),
			"importe_anio": importe_actual,
			"num_anio": sum(1 for p in ganados if p.por_anio.get(actual)),
			"puede_editar_objetivo": tiene_rol(*ROLES_DIRECCION),
		},
		"pipeline": {
			"anio": anio,
			"anios": sorted(anios, reverse=True),
			"objetivo": objetivo_del_anio(anio),
			"por_estado": list(columnas.values()),
			"por_cliente": reparto(ganados, anio, lambda p: p.cliente, "Sin cliente"),
			"por_tipo": [
				por_tipo.pop(t, {"clave": t, "num": 0, "importe": 0}) for t in TIPOS
			]
			+ list(por_tipo.values()),
		},
	}


@frappe.whitelist(methods=["POST"])
def guardar_objetivo(anio, importe):
	"""Fija el budget goal de un año. Solo dirección."""
	exigir_rol(*ROLES_DIRECCION)
	anio, importe = cint(anio), flt(importe)
	if anio < 2000 or anio > 2100:
		frappe.throw("Año no válido.")
	if frappe.db.exists("Objetivo Anual", {"anio": anio}):
		doc = frappe.get_doc("Objetivo Anual", {"anio": anio})
		doc.importe = importe
		doc.save(ignore_permissions=True)
	else:
		frappe.get_doc({"doctype": "Objetivo Anual", "anio": anio, "importe": importe}).insert(
			ignore_permissions=True
		)
	return importe
