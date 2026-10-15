import unicodedata

import frappe

from prototipo.roles import ROLES_GESTION, exigir_rol

# Los clientes son el DocType Customer de ERPNext (el mismo que enlazan los proyectos).
# La descripción se guarda en su campo customer_details.
CAMPOS_CLIENTE = ["name", "customer_name", "customer_details", "creation"]


def normalizar(texto):
	"""Minúsculas, sin tildes y sin espacios repetidos: "García  S.L." y "garcia s.l." son iguales."""
	sin_tildes = unicodedata.normalize("NFD", texto or "").encode("ascii", "ignore").decode()
	return " ".join(sin_tildes.lower().split())


def comprobar_duplicado(nombre, excepto=None):
	"""Detiene la petición si ya hay otro cliente con el mismo nombre (sin contar tildes ni mayúsculas)."""
	clave = normalizar(nombre)
	for c in frappe.get_all("Customer", fields=["name", "customer_name"]):
		if c.name != excepto and normalizar(c.customer_name) == clave:
			frappe.throw(f"Ya existe un cliente con ese nombre: {c.customer_name}.")


def limpiar_datos(nombre, descripcion):
	nombre = (nombre or "").strip()
	descripcion = (descripcion or "").strip() or None
	if not nombre:
		frappe.throw("El nombre es obligatorio.")
	return nombre, descripcion


@frappe.whitelist()
def listar_clientes():
	"""Todos los clientes. Solo para los roles de gestión."""
	exigir_rol(*ROLES_GESTION)
	return frappe.get_all("Customer", fields=CAMPOS_CLIENTE, order_by="customer_name asc")


@frappe.whitelist(methods=["POST"])
def crear_cliente(nombre, descripcion=None):
	"""Crea un cliente. Solo para los roles de gestión."""
	exigir_rol(*ROLES_GESTION)

	nombre, descripcion = limpiar_datos(nombre, descripcion)
	comprobar_duplicado(nombre)

	cliente = frappe.get_doc(
		{
			"doctype": "Customer",
			"customer_name": nombre,
			"customer_type": "Company",
			"customer_details": descripcion,
		}
	)
	cliente.insert(ignore_permissions=True)

	return {"name": cliente.name}


@frappe.whitelist(methods=["POST"])
def modificar_cliente(cliente, nombre, descripcion=None):
	"""Cambia el nombre y la descripción de un cliente. Solo para los roles de gestión."""
	exigir_rol(*ROLES_GESTION)

	if not frappe.db.exists("Customer", cliente):
		frappe.throw("El cliente no existe.")
	nombre, descripcion = limpiar_datos(nombre, descripcion)
	comprobar_duplicado(nombre, excepto=cliente)

	doc = frappe.get_doc("Customer", cliente)
	nombre_anterior = doc.customer_name
	doc.customer_name = nombre
	doc.customer_details = descripcion
	doc.save(ignore_permissions=True)

	# Si el identificador del cliente es su nombre (lo habitual en ERPNext), se renombra también,
	# para que los proyectos enlazados muestren el nombre nuevo. rename_doc actualiza los enlaces.
	if cliente == nombre_anterior and nombre != cliente:
		cliente = frappe.rename_doc("Customer", cliente, nombre, ignore_permissions=True, show_alert=False)

	return {"name": cliente}


@frappe.whitelist(methods=["POST"])
def eliminar_cliente(cliente):
	"""Borra un cliente de la base de datos. Solo para los roles de gestión."""
	exigir_rol(*ROLES_GESTION)

	if not frappe.db.exists("Customer", cliente):
		frappe.throw("El cliente no existe.")

	try:
		frappe.delete_doc("Customer", cliente, ignore_permissions=True)
	except frappe.LinkExistsError:
		frappe.throw(
			"No se puede eliminar el cliente porque tiene proyectos u otros registros vinculados."
		)
