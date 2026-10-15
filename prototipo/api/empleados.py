import frappe
from frappe.utils import cint, validate_email_address

from prototipo.roles import (
	ROL_COORDINADOR,
	ROL_EMPLEADO,
	ROLES_DIRECCION,
	ROLES_GESTION,
	exigir_rol,
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

# Roles que se pueden elegir desde la SPA y los roles de Frappe que recibe la cuenta.
# Los coordinadores también son empleados (imputan horas y salen en la lista).
ROLES_ASIGNABLES = {
	ROL_EMPLEADO: [ROL_EMPLEADO],
	ROL_COORDINADOR: [ROL_EMPLEADO, ROL_COORDINADOR],
}


def usuarios_con_rol(*roles):
	"""Nombres de los usuarios que tienen alguno de los roles (se guardan en la tabla hija Has Role)."""
	return set(
		frappe.get_all(
			"Has Role",
			filters={"role": ["in", roles], "parenttype": "User"},
			pluck="parent",
		)
	)


def comprobar_gestionable(usuario):
	"""Detiene la petición si el usuario de la sesión no puede modificar o borrar esa cuenta."""
	if usuario in USUARIOS_SISTEMA:
		frappe.throw("Las cuentas del sistema no se pueden modificar.")
	if usuario == frappe.session.user:
		frappe.throw("No puedes modificar ni eliminar tu propia cuenta desde aquí.")
	if not frappe.db.exists("User", usuario):
		frappe.throw("La cuenta no existe.")

	roles = set(frappe.get_roles(usuario))
	if ROL_EMPLEADO not in roles:
		frappe.throw("Solo se pueden gestionar cuentas de empleados.")
	if roles & set(ROLES_DIRECCION) and not tiene_rol(*ROLES_DIRECCION):
		frappe.throw("No tienes permiso para modificar esta cuenta.", frappe.PermissionError)


def limpiar_datos(nombre, apellidos, telefono, rol):
	"""Normaliza y valida los campos comunes de alta y modificación."""
	nombre = (nombre or "").strip()
	apellidos = (apellidos or "").strip()
	telefono = (telefono or "").strip() or None

	if not nombre:
		frappe.throw("El nombre es obligatorio.")
	if rol not in ROLES_ASIGNABLES:
		frappe.throw("El rol debe ser Empleado o Coordinador.")

	return nombre, apellidos, telefono


@frappe.whitelist()
def listar_empleados():
	"""Lista de cuentas con el rol Empleado. Solo para los roles de gestión."""
	exigir_rol(*ROLES_GESTION)

	empleados = usuarios_con_rol(ROL_EMPLEADO) - set(USUARIOS_SISTEMA)
	if not empleados:
		return []

	coordinadores = usuarios_con_rol(ROL_COORDINADOR)
	direccion = usuarios_con_rol(*ROLES_DIRECCION)
	soy_direccion = tiene_rol(*ROLES_DIRECCION)

	usuarios = frappe.get_all(
		"User",
		filters={"name": ["in", list(empleados)]},
		fields=CAMPOS_USUARIO,
		order_by="full_name asc",
	)
	for u in usuarios:
		u["es_coordinador"] = u.name in coordinadores
		# Mismas reglas que comprobar_gestionable, para que la SPA solo muestre los botones útiles
		u["editable"] = u.name != frappe.session.user and (soy_direccion or u.name not in direccion)
	return usuarios


@frappe.whitelist(methods=["POST"])
def crear_empleado(nombre, apellidos, email, password, telefono=None, rol=ROL_EMPLEADO):
	"""Crea una cuenta de empleado o coordinador. Solo para los roles de gestión."""
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
def modificar_empleado(usuario, nombre, apellidos=None, telefono=None, rol=ROL_EMPLEADO, activo=1, password=None):
	"""Modifica los datos, el rol, el estado y, opcionalmente, la contraseña de una cuenta de empleado.
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

	# Solo se añade o quita Coordinador; el resto de roles de la cuenta no se tocan
	es_coordinador = any(r.role == ROL_COORDINADOR for r in doc.roles)
	if rol == ROL_COORDINADOR and not es_coordinador:
		doc.append("roles", {"role": ROL_COORDINADOR})
	elif rol == ROL_EMPLEADO and es_coordinador:
		doc.set("roles", [r for r in doc.roles if r.role != ROL_COORDINADOR])

	doc.save(ignore_permissions=True)


@frappe.whitelist(methods=["POST"])
def eliminar_empleado(usuario):
	"""Borra de la base de datos una cuenta de empleado. Solo para los roles de gestión."""
	exigir_rol(*ROLES_GESTION)
	comprobar_gestionable(usuario)

	try:
		frappe.delete_doc("User", usuario, ignore_permissions=True)
	except frappe.LinkExistsError:
		frappe.throw(
			"No se puede eliminar la cuenta porque hay registros vinculados a ella. "
			"Desactívala en su lugar."
		)
