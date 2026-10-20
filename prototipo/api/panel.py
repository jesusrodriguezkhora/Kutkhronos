import frappe
from frappe.utils import add_months, flt, getdate, nowdate

from prototipo.roles import ROLES_GESTION, exigir_rol

# Estados en los que el proyecto se ha ganado (el cliente lo ha aceptado)
ESTADOS_GANADOS = ("Aceptado", "En curso", "Cerrado")
# Estados de la cartera viva: ganado y todavía sin terminar
ESTADOS_VIVOS = ("Aceptado", "En curso")
ESTADOS = ("Oportunidad", *ESTADOS_GANADOS, "Rechazado")

# Clientes que se muestran en el gráfico; el resto se agrupa en "Otros"
MAX_CLIENTES = 8
MESES = 12

CAMPOS = [
	"name",
	"cliente",
	"tipo",
	"via",
	"estado",
	"importe",
	"importe_consumido",
	"importe_disponible",
	"acuerdo_marco",
	"fecha_alta",
]


def resumen(proyectos):
	return {"num": len(proyectos), "importe": sum(flt(p.importe) for p in proyectos)}


def reparto(proyectos, campo, vacio="Sin especificar"):
	"""Importe ganado y en oportunidad agrupado por un campo, de mayor a menor importe total."""
	grupos = {}
	for p in proyectos:
		g = grupos.setdefault(p.get(campo) or vacio, {"num": 0, "ganado": 0, "oportunidad": 0})
		g["num"] += 1
		g["ganado" if p.estado in ESTADOS_GANADOS else "oportunidad"] += flt(p.importe)
	filas = [{"clave": clave, **g} for clave, g in grupos.items()]
	filas.sort(key=lambda f: f["ganado"] + f["oportunidad"], reverse=True)
	return filas


def agrupar_resto(filas, maximo):
	"""Deja las `maximo` primeras filas y suma las demás en una fila "Otros"."""
	if len(filas) <= maximo:
		return filas
	resto = filas[maximo - 1 :]
	otros = {
		"clave": f"Otros ({len(resto)})",
		"num": sum(f["num"] for f in resto),
		"ganado": sum(f["ganado"] for f in resto),
		"oportunidad": sum(f["oportunidad"] for f in resto),
		"es_resto": True,
	}
	return [*filas[: maximo - 1], otros]


def altas_por_mes(proyectos):
	"""Número e importe de los proyectos dados de alta en cada uno de los últimos MESES meses."""
	primero = getdate(add_months(nowdate(), -(MESES - 1))).replace(day=1)
	meses = {}
	for i in range(MESES):
		mes = getdate(add_months(primero, i)).strftime("%Y-%m")
		meses[mes] = {"mes": mes, "num": 0, "importe": 0}
	for p in proyectos:
		if not p.fecha_alta:
			continue
		mes = getdate(p.fecha_alta).strftime("%Y-%m")
		if mes in meses:
			meses[mes]["num"] += 1
			meses[mes]["importe"] += flt(p.importe)
	return list(meses.values())


@frappe.whitelist()
def obtener_panel():
	"""Indicadores y repartos del pipeline de proyectos para el panel. Solo para los roles de gestión.

	Los importes suman los proyectos principales (contratos, acuerdos marco y subvenciones), como las
	filas de la página Proyectos: el importe de los contratos basados ya está dentro del de su acuerdo
	marco, y sumar los dos lo contaría dos veces."""
	exigir_rol(*ROLES_GESTION)

	proyectos = frappe.get_list("Proyecto", fields=CAMPOS, limit_page_length=0)
	principales = [p for p in proyectos if not p.acuerdo_marco]
	por_estado = {e: [p for p in principales if p.estado == e] for e in ESTADOS}

	ganados = [p for p in principales if p.estado in ESTADOS_GANADOS]
	rechazados = por_estado["Rechazado"]

	# Saldo de los acuerdos marco vivos: lo que aún se puede encargar con contratos basados
	acuerdos = [p for p in principales if p.tipo == "Acuerdo marco" and p.estado != "Rechazado"]
	acuerdos_vivos = [a for a in acuerdos if a.estado in ESTADOS_VIVOS]
	basados_por_acuerdo = {}
	for p in proyectos:
		if p.acuerdo_marco:
			basados_por_acuerdo[p.acuerdo_marco] = basados_por_acuerdo.get(p.acuerdo_marco, 0) + 1

	# Lo que está en juego o ganado; los rechazados solo cuentan en el estado y en la tasa de éxito
	en_juego = [p for p in principales if p.estado != "Rechazado"]

	return {
		"indicadores": {
			"oportunidad": resumen(por_estado["Oportunidad"]),
			"cartera": resumen([p for p in principales if p.estado in ESTADOS_VIVOS]),
			"cerrado": resumen(por_estado["Cerrado"]),
			"rechazado": resumen(rechazados),
			# Tasa de éxito: ganados frente a decididos (ganados + rechazados)
			"tasa_exito": {
				"ganados": len(ganados),
				"decididos": len(ganados) + len(rechazados),
			},
			"acuerdos": {
				"num": len(acuerdos_vivos),
				"importe": sum(flt(a.importe) for a in acuerdos_vivos),
				"consumido": sum(flt(a.importe_consumido) for a in acuerdos_vivos),
				"disponible": sum(flt(a.importe_disponible) for a in acuerdos_vivos),
			},
		},
		"por_estado": [{"estado": e, **resumen(por_estado[e])} for e in ESTADOS],
		"por_tipo": reparto(en_juego, "tipo"),
		"por_via": reparto(en_juego, "via"),
		"por_cliente": agrupar_resto(reparto(en_juego, "cliente", "Sin cliente"), MAX_CLIENTES),
		"por_mes": altas_por_mes(principales),
		"acuerdos_marco": sorted(
			(
				{
					"name": a.name,
					"cliente": a.cliente,
					"estado": a.estado,
					"importe": flt(a.importe),
					"consumido": flt(a.importe_consumido),
					"disponible": flt(a.importe_disponible),
					"contratos_basados": basados_por_acuerdo.get(a.name, 0),
				}
				for a in acuerdos
			),
			key=lambda a: a["importe"],
			reverse=True,
		),
	}
