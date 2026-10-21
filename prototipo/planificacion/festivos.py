"""Festivos de Madrid capital para la planificación.

Se descargan del calendario laboral del Ayuntamiento de Madrid (datos abiertos), que incluye los
festivos nacionales, los de la Comunidad de Madrid y los locales de Madrid capital, y se guardan en un
Holiday List de ERPNext por año ("Festivos Madrid 2026"). La planificación solo lee esas listas.

Conjunto de datos: https://datos.madrid.es/dataset/300082-0-calendario_laboral
"""
import csv
import io
from datetime import date, datetime

import frappe
import requests
from frappe.utils import getdate, strip_html

URL_CALENDARIO = (
	"https://datos.madrid.es/dataset/300082-0-calendario_laboral/resource/"
	"300082-1-calendario_laboral-csv/download/300082-1-calendario_laboral-csv.csv"
)
PREFIJO_LISTA = "Festivos Madrid"


def nombre_lista(anio):
	return f"{PREFIJO_LISTA} {anio}"


def leer_csv(contenido):
	"""Devuelve (fecha, descripción) de cada festivo del CSV del Ayuntamiento.

	Columnas: Dia (dd/mm/aaaa) ; Dia_semana ; laborable / festivo / domingo festivo ;
	Tipo de Festivo ; Festividad. Solo interesan las filas "festivo": un "domingo festivo"
	no afecta a la planificación, que va de lunes a viernes.
	"""
	filas = csv.reader(io.StringIO(contenido.decode("utf-8-sig")), delimiter=";")
	next(filas, None)  # cabecera
	for fila in filas:
		if len(fila) < 5:
			continue
		dia, _, tipo_dia, tipo_festivo, festividad = (c.strip() for c in fila[:5])
		if tipo_dia.lower() != "festivo":
			continue
		fecha = datetime.strptime(dia, "%d/%m/%Y").date()
		descripcion = f"{festividad} ({tipo_festivo})" if tipo_festivo else festividad
		yield fecha, descripcion


def guardar_lista(anio, festivos):
	"""Crea o actualiza el Holiday List del año. Los festivos que se hayan añadido a mano y no estén
	en el calendario del Ayuntamiento (p. ej., un día de cierre de la empresa) se conservan."""
	nombre = nombre_lista(anio)
	if frappe.db.exists("Holiday List", nombre):
		doc = frappe.get_doc("Holiday List", nombre)
	else:
		doc = frappe.new_doc("Holiday List")
		doc.holiday_list_name = nombre
		doc.from_date = date(anio, 1, 1)
		doc.to_date = date(anio, 12, 31)

	existentes = {getdate(h.holiday_date): h for h in doc.holidays}
	nuevos = 0
	for fecha, descripcion in sorted(festivos.items()):
		if fecha in existentes:
			existentes[fecha].description = descripcion
		else:
			doc.append("holidays", {"holiday_date": fecha, "description": descripcion})
			nuevos += 1

	doc.save(ignore_permissions=True)
	return f"{len(festivos)} festivos del Ayuntamiento ({nuevos} nuevos)"


def importar_festivos(anios=None):
	"""Descarga el calendario y actualiza las listas de los años indicados (por defecto, el actual y el
	siguiente). Uso manual:
	    bench --site <site> execute prototipo.planificacion.festivos.importar_festivos
	    bench --site <site> execute prototipo.planificacion.festivos.importar_festivos --kwargs "{'anios': [2025]}"
	"""
	respuesta = requests.get(URL_CALENDARIO, timeout=30)
	respuesta.raise_for_status()

	por_anio = {}
	for fecha, descripcion in leer_csv(respuesta.content):
		por_anio.setdefault(fecha.year, {})[fecha] = descripcion

	if not anios:
		actual = getdate().year
		anios = [actual, actual + 1]

	resumen = {}
	for anio in (int(a) for a in anios):
		if por_anio.get(anio):
			resumen[anio] = guardar_lista(anio, por_anio[anio])
		else:
			# El Ayuntamiento publica el año siguiente hacia final de año: se reintentará la semana próxima
			resumen[anio] = "todavía no está en el calendario del Ayuntamiento"
	return resumen


def importar_festivos_programado():
	"""Tarea semanal (hooks.py): si falla (p. ej., la web no responde), lo deja en el Error Log."""
	try:
		importar_festivos()
	except Exception:  # noqa: BLE001
		frappe.log_error(title="Importar festivos de Madrid")


def festivos_detalle(inicio, fin):
	"""[{fecha, descripcion}] de los festivos entre dos fechas, ambas incluidas, según las listas
	"Festivos Madrid AAAA"."""
	filas = frappe.get_all(
		"Holiday",
		filters={
			"parenttype": "Holiday List",
			"parent": ["like", f"{PREFIJO_LISTA} %"],
			"holiday_date": ["between", [inicio, fin]],
		},
		fields=["holiday_date", "description"],
		order_by="holiday_date asc",
	)
	return [
		{"fecha": getdate(f.holiday_date), "descripcion": strip_html(f.description or "").strip()}
		for f in filas
	]


def festivos_entre(inicio, fin):
	"""Fechas festivas entre dos fechas, ambas incluidas."""
	return {f["fecha"] for f in festivos_detalle(inicio, fin)}