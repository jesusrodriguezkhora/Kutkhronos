import frappe
from frappe.utils import cint, validate_email_address

from prototipo.roles import (
	ROLES_APP,
	ROLES_ASIGNABLES,
	ROLES_DIRECCION,
	ROLES_GESTION,
	exigir_rol,
	rol_principal,
	roles_asignables,
	tiene_rol,
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


def roles_por_usuario(*roles):
	"""{usuario: {roles}} de los usuarios que tienen alguno de los roles indicados
	(los roles de un usuario se guardan en la tabla hija Has Role)."""
	resultado = {}
	for fila in frappe.get_all(
		"Has Role",
		filters={"role": ["in", roles], "parenttype": "User"},
		fields=["parent", "role"],
	):
		resultado.setdefault(fila.parent, set()).add(fila.role)
	return resultado


def comprobar_gestionable(usuario):
	"""Detiene la petición si el usuario de la sesión no puede modificar o borrar esa cuenta."""
	if usuario in USUARIOS_SISTEMA:
		frappe.throw("Las cuentas del sistema no se pueden modificar.")
	if usuario == frappe.session.user:
		frappe.throw("No puedes modificar ni eliminar tu propia cuenta desde aquí.")
	if not frappe.db.exists("User", usuario):
		frappe.throw("La cuenta no existe.")

	roles = set(frappe.get_roles(usuario))
	if not roles & set(ROLES_APP):
		frappe.throw("Solo se pueden gestionar cuentas de la aplicación.")
	if roles & set(ROLES_DIRECCION) and not tiene_rol(*ROLES_DIRECCION):
		frappe.throw("No tienes permiso para modificar esta cuenta.", frappe.PermissionError)


def limpiar_datos(nombre, apellidos, telefono, rol):
	"""Normaliza y valida los campos comunes de alta y modificación."""
	nombre = (nombre or "").strip()
	apellidos = (apellidos or "").strip()
	telefono = (telefono or "").strip() or None

	if not nombre:
		frappe.throw("El nombre es obligatorio.")
	if rol not in roles_asignables():
		frappe.throw("No puedes asignar ese rol.", frappe.PermissionError)

	return nombre, apellidos, telefono


@frappe.whitelist()
def listar_empleados():
	"""Todas las cuentas con algún rol de la aplicación. Solo para los roles de gestión."""
	exigir_rol(*ROLES_GESTION)

	roles = roles_por_usuario(*ROLES_APP, *ROLES_DIRECCION)
	cuentas = [u for u, r in roles.items() if r & set(ROLES_APP) and u not in USUARIOS_SISTEMA]
	if not cuentas:
		return []

	soy_direccion = tiene_rol(*ROLES_DIRECCION)
	usuarios = frappe.get_all(
		"User",
		filters={"name": ["in", cuentas]},
		fields=CAMPOS_USUARIO,
		order_by="full_name asc",
	)
	for u in usuarios:
		u["rol"] = rol_principal(roles[u.name])
		# Mismas reglas que comprobar_gestionable, para que la SPA solo muestre los botones útiles
		u["editable"] = u.name != frappe.session.user and (
			soy_direccion or not roles[u.name] & set(ROLES_DIRECCION)
		)
	return usuarios


@frappe.whitelist(methods=["POST"])
def crear_empleado(nombre, apellidos, email, password, telefono=None, rol="Empleado"):
	"""Crea una cuenta con el rol elegido. Solo para los roles de gestión."""
	exigir_rol(*ROLES_GESTION)

	nombre, apellidos, telefono = limpiar_datos(nombre, apellidos, telefono, rol)
	email = (email or "").strip().lower()

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
			"roles": [{"role": r} for r in ROLES_ASIGNABLES[rol]],
		}
	)
	usuario.insert(ignore_permissions=True)

	return {"name": usuario.name}


@frappe.whitelist(methods=["POST"])
def modificar_empleado(usuario, nombre, apellidos=None, telefono=None, rol="Empleado", activo=1, password=None):
	"""Modifica los datos, el rol, el estado y, opcionalmente, la contraseña de una cuenta.
	Solo para los roles de gestión."""
	exigir_rol(*ROLES_GESTION)
	comprobar_gestionable(usuario)

	nombre, apellidos, telefono = limpiar_datos(nombre, apellidos, telefono, rol)

	doc = frappe.get_doc("User", usuario)
	doc.first_name = nombre
	doc.last_name = apellidos
	doc.mobile_no = telefono
	doc.enabled = 1 if cint(activo) else 0
	if password:
		doc.new_password = password

	# Si cambia el rol, se sustituyen los roles de la aplicación; el resto (System Manager…) se mantienen
	if rol != rol_principal({r.role for r in doc.roles}):
		doc.set("roles", [r for r in doc.roles if r.role not in ROLES_APP])
		for r in ROLES_ASIGNABLES[rol]:
			doc.append("roles", {"role": r})

	doc.save(ignore_permissions=True)


@frappe.whitelist(methods=["POST"])
def eliminar_empleado(usuario):
	"""Borra de la base de datos una cuenta. Solo para los roles de gestión."""
	exigir_rol(*ROLES_GESTION)
	comprobar_gestionable(usuario)

	try:
		frappe.delete_doc("User", usuario, ignore_permissions=True)
	except frappe.LinkExistsError:
		frappe.throw(
			"No se puede eliminar la cuenta porque hay registros vinculados a ella. "
			"Desactívala en su lugar."
		)
