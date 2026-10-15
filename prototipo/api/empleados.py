import frappe
from frappe.utils import validate_email_address

from prototipo.roles import (
	ROL_COORDINADOR,
	ROL_EMPLEADO,
	ROLES_GESTION,
	exigir_administrador,
	exigir_rol,
)

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
def crear_empleado(nombre, apellidos, email, password, telefono=None):
	"""Crea una cuenta con el rol Empleado. Solo para coordinadores y CEO."""
	exigir_rol(*ROLES_GESTION)

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
			"roles": [{"role": ROL_EMPLEADO}],
		}
	)
	usuario.insert(ignore_permissions=True)

	return {"name": usuario.name}


@frappe.whitelist(methods=["POST"])
def eliminar_empleado(usuario):
	"""Borra de la base de datos una cuenta con el rol Empleado. Solo para administradores."""
	exigir_administrador()

	if usuario in USUARIOS_SISTEMA:
		frappe.throw("Las cuentas del sistema no se pueden eliminar.")
	if usuario == frappe.session.user:
		frappe.throw("No puedes eliminar tu propia cuenta.")
	if not frappe.db.exists("User", usuario):
		frappe.throw("La cuenta no existe.")
	if usuario not in usuarios_con_rol(ROL_EMPLEADO):
		frappe.throw("Solo se pueden eliminar cuentas de empleados.")

	try:
		frappe.delete_doc("User", usuario)
	except frappe.LinkExistsError:
		frappe.throw(
			"No se puede eliminar la cuenta porque hay registros vinculados a ella. "
			"Desactívala en su lugar."
		)
