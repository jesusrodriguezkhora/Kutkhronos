import frappe
from frappe.utils import validate_email_address

from prototipo.roles import ROL_CEO, ROL_COORDINADOR, ROL_EMPLEADO, ROLES_GESTION, exigir_rol

CAMPOS_USUARIO = [
	"name",
	"email",
	"first_name",
	"last_name",
	"full_name",
	"mobile_no",
	"enabled",
	"creation",
]

USUARIOS_SISTEMA = ("Administrator", "Guest")


def usuarios_con_rol(rol):
	"""Nombres de los usuarios que tienen un rol (los roles de un usuario se guardan en la tabla hija Has Role)."""
	return set(
		frappe.get_all("Has Role", filters={"role": rol, "parenttype": "User"}, pluck="parent")
	)


@frappe.whitelist()
def listar_empleados():
	"""Lista de cuentas con el rol Empleado. Solo para coordinadores y CEO."""
	exigir_rol(*ROLES_GESTION)

	empleados = usuarios_con_rol(ROL_EMPLEADO) - set(USUARIOS_SISTEMA)
	if not empleados:
		return []

	coordinadores = usuarios_con_rol(ROL_COORDINADOR)
	usuarios = frappe.get_all(
		"User",
		filters={"name": ["in", list(empleados)]},
		fields=CAMPOS_USUARIO,
		order_by="full_name asc",
	)
	for u in usuarios:
		u["es_coordinador"] = u.name in coordinadores
	return usuarios


@frappe.whitelist(methods=["POST"])
def crear_empleado(nombre, apellidos, email, password, telefono=None, rol=ROL_EMPLEADO):
	"""Crea una cuenta de empleado o coordinador. Solo para coordinadores y CEO.

	Los coordinadores también llevan el rol Empleado, para que aparezcan en el listado e imputen horas.
	"""
	exigir_rol(*ROLES_GESTION)

	if rol not in (ROL_EMPLEADO, ROL_COORDINADOR):
		frappe.throw("El rol debe ser Empleado o Coordinador.")
	roles = [ROL_EMPLEADO] if rol == ROL_EMPLEADO else [ROL_EMPLEADO, ROL_COORDINADOR]

	nombre = (nombre or "").strip()
	apellidos = (apellidos or "").strip()
	email = (email or "").strip().lower()
	telefono = (telefono or "").strip() or None

	if not nombre:
		frappe.throw("El nombre es obligatorio.")
	if not email:
		frappe.throw("El correo es obligatorio.")
	validate_email_address(email, throw=True)
	if frappe.db.exists("User", email):
		frappe.throw("Ya existe una cuenta con ese correo.")
	if not password:
		frappe.throw("La contraseña es obligatoria.")

	usuario = frappe.get_doc(
		{
			"doctype": "User",
			"email": email,
			"first_name": nombre,
			"last_name": apellidos,
			"mobile_no": telefono,
			"send_welcome_email": 0,
			"new_password": password,
			"roles": [{"role": r} for r in roles],
		}
	)
	usuario.insert(ignore_permissions=True)

	return {"name": usuario.name}


@frappe.whitelist(methods=["POST"])
def eliminar_empleado(usuario):
	"""Borra definitivamente la cuenta de un empleado o coordinador. Solo para coordinadores y CEO."""
	exigir_rol(*ROLES_GESTION)

	if usuario in USUARIOS_SISTEMA:
		frappe.throw("Esta cuenta es del sistema y no se puede eliminar.")
	if usuario == frappe.session.user:
		frappe.throw("No puedes eliminar tu propia cuenta.")
	if not frappe.db.exists("User", usuario) or usuario not in usuarios_con_rol(ROL_EMPLEADO):
		frappe.throw("No existe ningún empleado con esa cuenta.")
	if usuario in usuarios_con_rol(ROL_CEO):
		frappe.throw("Las cuentas con el rol CEO no se pueden eliminar desde aquí.")

	try:
		frappe.delete_doc("User", usuario, ignore_permissions=True)
	except frappe.LinkExistsError:
		frappe.throw(
			"No se puede eliminar porque la cuenta tiene registros asociados. Desactívala en su lugar."
		)

	return {"name": usuario}