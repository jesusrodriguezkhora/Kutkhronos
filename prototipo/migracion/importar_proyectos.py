"""Importa en Khronos los proyectos de la hoja limpia (<nombre>-fixed.xlsx, generada por limpiar.py).

- Los códigos los genera Khronos (autoname del DocType Proyecto, con el año de la fecha de alta).
- Los clientes que no existan se crean (se comparan sin tildes, mayúsculas ni espacios repetidos).
- Los contratos basados se enlazan con su acuerdo marco a través de la columna ACUERDO PADRE,
  que contiene el ID_ORIGEN del acuerdo. El ID_ORIGEN no se guarda en Khronos: solo sirve para
  enlazar durante la importación y para el informe.
- El responsable se busca entre los empleados y coordinadores activos por "Nombre Apellido".
- TODO O NADA: si hay un solo error no se guarda nada. Corrige el Excel y vuelve a lanzarlo.

Uso (desde frappe-bench). Por defecto es una SIMULACIÓN: lo hace todo y al final deshace los cambios.

    bench --site <site> execute prototipo.migracion.importar_proyectos.importar \\
        --kwargs "{'ruta': '/ruta/HOJA-fixed.xlsx'}"

    bench --site <site> execute prototipo.migracion.importar_proyectos.importar \\
        --kwargs "{'ruta': '/ruta/HOJA-fixed.xlsx', 'simular': False}"

Deja un informe junto al Excel: <nombre>-informe.csv (fila, ID_ORIGEN, código en Khronos, resultado).
"""
import csv
from datetime import date, datetime
from pathlib import Path

import frappe
from frappe.utils import getdate, nowdate, strip_html
from openpyxl import load_workbook

from prototipo.api.clientes import normalizar
from prototipo.api.responsables import responsables_posibles

# --- Configuración -----------------------------------------------------------

# Clave interna -> nombre de la columna en el Excel limpio
COLUMNAS = {
	"id_origen": "ID_ORIGEN",
	"tipo": "TIPO",
	"estado": "ESTADO",
	"cliente": "CLIENTE",
	"proyecto": "PROYECTO",
	"responsable": "RESPONSABLES",
	"fecha_inicio": "FECHA INICIO",
	"fecha_fin": "FECHA FIN",
	"importe": "IMPORTE TOTAL (CON IVA)",
	"acuerdo_padre": "ACUERDO PADRE",
	"via": "VIA",
}
OBLIGATORIAS = ("id_origen", "tipo", "cliente", "proyecto")

# Campos que tiene que tener el DocType Proyecto para poder importar
CAMPOS_NECESARIOS = ("descripcion", "fecha_fin", "responsable")

# Valor de la columna TIPO -> tipo en Khronos
TIPOS = {
	"contrato": "Contrato",
	"acuerdo marco": "Acuerdo marco",
	"contrato basado": "Contrato basado",
}

# Estado que se pone a los contratos basados que no tienen estado en el Excel.
# None = se quedan sin estado (y no consumen saldo del acuerdo marco).
ESTADO_BASADO_SIN_ESTADO = None

# Vía para las filas que no la traen. En los basados da igual: Khronos copia la del acuerdo.
VIA_POR_DEFECTO = "Licitación pública"

# Qué hacer si el nombre de RESPONSABLES no corresponde a ningún empleado activo:
# False = es un error (no se importa nada); True = el proyecto queda sin responsable y se avisa.
IGNORAR_RESPONSABLES_DESCONOCIDOS = False

SAVEPOINT = "importar_proyecto"


# --- Lectura del Excel -------------------------------------------------------

def nombre_columna(valor):
	return " ".join(str(valor or "").upper().split())


def limpiar_celda(valor):
	if isinstance(valor, str):
		valor = valor.strip()
		return valor or None
	return valor


def leer_excel(ruta, hoja=None):
	"""Devuelve una lista de diccionarios (una por fila con datos) con las claves de COLUMNAS."""
	libro = load_workbook(ruta, read_only=True, data_only=True)
	try:
		ws = libro[hoja] if hoja else libro.worksheets[0]
		filas = ws.iter_rows(values_only=True)
		cabecera = [nombre_columna(c) for c in next(filas)]

		indices = {clave: cabecera.index(col) for clave, col in COLUMNAS.items() if col in cabecera}
		faltan = [COLUMNAS[c] for c in OBLIGATORIAS if c not in indices]
		if faltan:
			frappe.throw(f"Faltan columnas en el Excel: {', '.join(faltan)}.")

		registros = []
		for numero, fila in enumerate(filas, start=2):
			if all(limpiar_celda(v) is None for v in fila):
				continue
			registro = {c: limpiar_celda(fila[i]) if i < len(fila) else None for c, i in indices.items()}
			registro["fila"] = numero
			registros.append(registro)
		return registros
	finally:
		libro.close()


# --- Conversión de valores ---------------------------------------------------

def a_fecha(valor):
	"""Fecha de Excel o texto DD/MM/AAAA -> date. Vacío -> None."""
	if valor is None:
		return None
	if isinstance(valor, datetime):
		return valor.date()
	if isinstance(valor, date):
		return valor
	texto = str(valor).split()[0]
	for formato in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y"):
		try:
			return datetime.strptime(texto, formato).date()
		except ValueError:
			pass
	raise ValueError(f"fecha no válida: {valor}")


def a_importe(valor):
	"""Número de Excel o texto con formato español (1.234,56 €) -> float. Vacío -> 0."""
	if valor is None:
		return 0.0
	if isinstance(valor, (int, float)):
		return float(valor)
	texto = str(valor).replace("€", "").replace(" ", "")
	if "," in texto:
		texto = texto.replace(".", "").replace(",", ".")
	try:
		return float(texto)
	except ValueError:
		raise ValueError(f"importe no válido: {valor}") from None


# --- Responsables ------------------------------------------------------------

def indice_responsables():
	"""{nombre normalizado: usuario} de los empleados y coordinadores activos.

	Cada cuenta se puede encontrar por "Nombre Apellido" (primera palabra de los apellidos)
	y por su nombre completo. Las claves que comparten dos cuentas se marcan como ambiguas (None).
	"""
	usuarios = [u.name for u in responsables_posibles()]
	indice = {}
	for u in frappe.get_all(
		"User", filters={"name": ["in", usuarios or [""]]}, fields=["name", "first_name", "last_name", "full_name"]
	):
		primer_apellido = (u.last_name or "").split()[:1]
		claves = {
			normalizar(" ".join([u.first_name or "", *primer_apellido])),
			normalizar(u.full_name),
		}
		for clave in filter(None, claves):
			indice[clave] = None if indice.get(clave, u.name) != u.name else u.name
	return indice


def buscar_responsable(nombre, indice):
	"""Usuario del responsable, o (None, aviso) si se ignora un desconocido. Lanza ValueError si no."""
	if not nombre:
		return None, ""
	clave = normalizar(str(nombre))
	if clave in indice and indice[clave] is None:
		raise ValueError(f"responsable ambiguo (hay varias cuentas que se llaman así): {nombre}")
	if clave in indice:
		return indice[clave], ""
	if IGNORAR_RESPONSABLES_DESCONOCIDOS:
		return None, f"responsable no encontrado, se deja vacío: {nombre}"
	raise ValueError(f"responsable no encontrado entre los empleados activos: {nombre}")


# --- Preparación de cada fila ------------------------------------------------

def preparar(registro, responsables):
	"""Convierte una fila del Excel en (valores del Proyecto, aviso). Lanza ValueError si hay algo mal."""
	tipo_excel = (registro.get("tipo") or "").lower()
	if tipo_excel not in TIPOS:
		raise ValueError(f"tipo desconocido: {registro.get('tipo')}")
	tipo = TIPOS[tipo_excel]

	if tipo == "Contrato basado" and not registro.get("acuerdo_padre"):
		raise ValueError("contrato basado sin ACUERDO PADRE")
	if tipo != "Contrato basado" and not registro.get("cliente"):
		raise ValueError("fila sin CLIENTE")

	estado = registro.get("estado")
	if not estado and tipo == "Contrato basado":
		estado = ESTADO_BASADO_SIN_ESTADO

	responsable, aviso = buscar_responsable(registro.get("responsable"), responsables)

	return {
		"tipo": tipo,
		"estado": estado,
		"importe": a_importe(registro.get("importe")),
		"via": registro.get("via") or VIA_POR_DEFECTO,
		"fecha_alta": a_fecha(registro.get("fecha_inicio")),
		"fecha_fin": a_fecha(registro.get("fecha_fin")),
		"responsable": responsable,
		"descripcion": str(registro["proyecto"]),
	}, aviso


def clave_duplicado(tipo, descripcion, fecha_alta):
	"""Para detectar proyectos que ya están en Khronos (p. ej. si se lanza la importación dos veces)."""
	return (tipo, normalizar(descripcion), getdate(fecha_alta or nowdate()))


# --- Clientes ----------------------------------------------------------------

def obtener_cliente(nombre, clientes, nuevos):
	"""Devuelve el Customer con ese nombre; si no existe, lo crea y lo apunta en `nuevos`."""
	clave = normalizar(nombre)
	if clave not in clientes:
		cliente = frappe.get_doc(
			{"doctype": "Customer", "customer_name": nombre, "customer_type": "Company"}
		).insert(ignore_permissions=True)
		clientes[clave] = cliente.name
		nuevos.append(clave)
	return clientes[clave]


# --- Importación -------------------------------------------------------------

def importar_fila(registro, datos, codigos, clientes):
	"""Crea un proyecto. Si falla, deshace solo lo de esta fila (incluido un cliente recién creado),
	para que el resto de filas se puedan seguir comprobando y el informe recoja todos los errores."""
	nuevos_clientes = []
	frappe.db.savepoint(SAVEPOINT)
	try:
		doc = {"doctype": "Proyecto", **{k: v for k, v in datos.items() if v is not None}}

		if datos["tipo"] == "Contrato basado":
			acuerdo = codigos.get(registro["acuerdo_padre"])
			if not acuerdo:
				raise ValueError(f"su acuerdo marco {registro['acuerdo_padre']} no se ha podido importar")
			doc["acuerdo_marco"] = acuerdo  # cliente y vía los copia Khronos del acuerdo
		else:
			doc["cliente"] = obtener_cliente(registro["cliente"], clientes, nuevos_clientes)

		proyecto = frappe.get_doc(doc).insert(ignore_permissions=True)
		frappe.db.release_savepoint(SAVEPOINT)
		codigos[registro["id_origen"]] = proyecto.name
		return proyecto.name, nuevos_clientes
	except Exception:
		frappe.db.rollback(save_point=SAVEPOINT)
		for clave in nuevos_clientes:
			clientes.pop(clave, None)
		frappe.clear_messages()
		raise


def importar(ruta, hoja=None, simular=True):
	frappe.set_user("Administrator")
	simular = simular not in (False, 0, "0", "false", "False", "no")

	campos = {f.fieldname for f in frappe.get_meta("Proyecto").fields}
	faltan = [c for c in CAMPOS_NECESARIOS if c not in campos]
	if faltan:
		frappe.throw(f"Faltan campos en el DocType Proyecto: {', '.join(faltan)}. Ejecuta bench migrate.")

	registros = leer_excel(ruta, hoja)
	clientes = {normalizar(c.customer_name): c.name for c in frappe.get_all("Customer", fields=["name", "customer_name"])}
	responsables = indice_responsables()
	existentes = {
		clave_duplicado(p.tipo, p.descripcion, p.fecha_alta): p.name
		for p in frappe.get_all("Proyecto", fields=["name", "tipo", "descripcion", "fecha_alta"])
	}

	informe = []

	def anotar(registro, resultado, codigo=None, mensaje=""):
		informe.append(
			{
				"fila": registro["fila"],
				"id_origen": registro.get("id_origen"),
				"tipo": registro.get("tipo"),
				"codigo": codigo,
				"resultado": resultado,
				"mensaje": mensaje,
			}
		)

	# 1. Validar y convertir cada fila
	vistos = set()
	validos = []
	for registro in registros:
		id_origen = registro.get("id_origen")
		try:
			if not id_origen:
				raise ValueError("fila sin ID_ORIGEN")
			if id_origen in vistos:
				raise ValueError("ID_ORIGEN repetido en el Excel")
			vistos.add(id_origen)
			datos, aviso = preparar(registro, responsables)
			duplicado = existentes.get(clave_duplicado(datos["tipo"], datos["descripcion"], datos["fecha_alta"]))
			if duplicado:
				raise ValueError(f"ya existe en Khronos como {duplicado} (¿importación repetida?)")
			validos.append((registro, datos, aviso))
		except ValueError as e:
			anotar(registro, "error", mensaje=str(e))

	# 2. Primero contratos y acuerdos marco (por fecha, para que la numeración siga el orden
	#    cronológico); después los contratos basados, cuando ya existen sus acuerdos.
	def orden(item):
		registro, datos, _ = item
		return (datos["tipo"] == "Contrato basado", datos["fecha_alta"] or date.max, registro["fila"])

	codigos = {}  # ID_ORIGEN -> código en Khronos de lo creado en esta ejecución
	creados, clientes_creados = 0, 0
	for registro, datos, aviso in sorted(validos, key=orden):
		try:
			codigo, nuevos = importar_fila(registro, datos, codigos, clientes)
		except Exception as e:  # noqa: BLE001
			anotar(registro, "error", mensaje=strip_html(str(e)) or repr(e))
			continue
		creados += 1
		clientes_creados += len(nuevos)
		avisos = [aviso]
		if nuevos:
			avisos.append(f"cliente nuevo: {registro['cliente']}")
		if not datos["fecha_alta"]:
			avisos.append("sin FECHA INICIO: fecha de alta = hoy")
		anotar(registro, "creado", codigo, "; ".join(filter(None, avisos)))

	errores = [r for r in informe if r["resultado"] == "error"]
	guardado = not simular and not errores
	if guardado:
		frappe.db.commit()
	else:
		frappe.db.rollback()

	# 3. Informe
	informe.sort(key=lambda r: r["fila"])
	ruta_informe = Path(ruta).with_name(f"{Path(ruta).stem}-informe.csv")
	with open(ruta_informe, "w", newline="", encoding="utf-8-sig") as f:
		escritor = csv.DictWriter(
			f, fieldnames=["fila", "id_origen", "tipo", "codigo", "resultado", "mensaje"], delimiter=";"
		)
		escritor.writeheader()
		escritor.writerows(informe)

	if guardado:
		titulo = "IMPORTACIÓN GUARDADA"
	elif simular:
		titulo = "SIMULACIÓN: no se ha guardado nada"
	else:
		titulo = "HAY ERRORES: no se ha guardado nada"
	print(f"\n{titulo}")
	verbo = "creados" if guardado else "que se crearían"
	for etiqueta, valor in (
		("Filas leídas", len(registros)),
		(f"Proyectos {verbo}", creados),
		(f"Clientes {verbo}", clientes_creados),
		("Errores", len(errores)),
	):
		print(f"  {etiqueta + ':':<28}{valor}")
	for r in errores:
		print(f"    fila {r['fila']} ({r['id_origen']}): {r['mensaje']}")
	print(f"  Informe: {ruta_informe}\n")

	return {"guardado": guardado, "proyectos": creados, "clientes": clientes_creados, "errores": len(errores)}