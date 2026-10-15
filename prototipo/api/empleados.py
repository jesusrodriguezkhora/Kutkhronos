import frappe
from frappe.utils import cint, flt, validate_email_address

from prototipo.roles import (
	ROLES_APP,
	ROLES_ASIGNABLES,
	ROLES_DATOS_LABORALES,
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

# Datos de cada cuenta que solo ven y editan los roles de ROLES_DATOS_LABORALES.
# Están en un DocType aparte (no en User) para que nadie más pueda leerlos, ni siquiera el propio empleado.
DOCTYPE_LABORAL = "Datos Laborales"
CAMPOS_LABORALES = ["posicion", "salario_anual", "horas_semanales", "coste_hora"]


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


def limpiar_datos(nombre, apellidos, telefono, rol, rol_actual=None):
	"""Normaliza y valida los campos comunes de alta y modificación.
	`rol_actual`: al editar, mantener el rol que ya tiene la cuenta siempre está permitido."""
	nombre = (nombre or "").strip()
	apellidos = (apellidos or "").strip()
	telefono = (telefono or "").strip() or None

	if not nombre:
		frappe.throw("El nombre es obligatorio.")
	if rol != rol_actual and rol not in roles_asignables():
		frappe.throw("No puedes asignar ese rol.", frappe.PermissionError)

	return nombre, apellidos, telefono


def guardar_datos_laborales(usuario, posicion, salario_anual, horas_semanales):
	"""Crea o actualiza los datos laborales de una cuenta. Los tres a None significa que no se
	enviaron (la SPA solo los envía a quien puede verlos), y entonces no se tocan."""
	if posicion is None and salario_anual is None and horas_semanales is None:
		return
	exigir_rol(*ROLES_DATOS_LABORALES)

	posicion = (posicion or "").strip() or None
	salario_anual = flt(salario_anual) or None
	horas_semanales = flt(horas_semanales) or None
	if salario_anual is not None and salario_anual < 0:
		frappe.throw("El salario no puede ser negativo.")
	if horas_semanales is not None and not 0 < horas_semanales <= 168:
		frappe.throw("Las horas semanales deben estar entre 0 y 168.")

	if frappe.db.exists(DOCTYPE_LABORAL, usuario):
		doc = frappe.get_doc(DOCTYPE_LABORAL, usuario)
	elif not (posicion or salario_anual or horas_semanales):
		return  # Todo vacío y sin registro previo: no hace falta crearlo
	else:
		doc = frappe.new_doc(DOCTYPE_LABORAL)
		doc.usuario = usuario
	doc.posicion = posicion
	doc.salario_anual = salario_anual
	doc.horas_semanales = horas_semanales
	doc.save(ignore_permissions=True)


@frappe.whitelist()
def listar_empleados():
	"""Todas las cuentas con algún rol de la aplicación. Solo para los roles de gestión."""
	exigir_rol(*ROLES_GESTION)

	roles = roles_por_usuario(*ROLES_APP, *ROLES_DIRECCION)
	cuentas = [u for u, r in roles.items() if r & set(ROLES_APP) and u not in USUARIOS_SISTEMA]
	if not cuentas:
		return []

	soy_direccion = tiene_rol(*ROLES_DIRECCION)
	ve_laborales = tiene_rol(*ROLES_DATOS_LABORALES)
	laborales = {}
	if ve_laborales:
		for d in frappe.get_all(DOCTYPE_LABORAL, fields=["usuario", *CAMPOS_LABORALES]):
			laborales[d.pop("usuario")] = d

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
		if ve_laborales:
			u.update(laborales.get(u.name) or dict.fromkeys(CAMPOS_LABORALES))
	return usuarios


@frappe.whitelist(methods=["POST"])
def crear_empleado(
	nombre,
	apellidos,
	email,
	password,
	telefono=None,
	rol="Empleado",
	posicion=None,
	salario_anual=None,
	horas_semanales=None,
):
	"""Crea una cuenta con el rol elegido. Solo para los roles de gestión.
	Los datos laborales son opcionales y solo los pueden enviar los roles de ROLES_DATOS_LABORALES."""
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
	guardar_datos_laborales(usuario.name, posicion, salario_anual, horas_semanales)

	return {"name": usuario.name}


@frappe.whitelist(methods=["POST"])
def modificar_empleado(
	usuario,
	nombre,
	apellidos=None,
	telefono=None,
	rol="Empleado",
	activo=1,
	password=None,
	posicion=None,
	salario_anual=None,
	horas_semanales=None,
):
	"""Modifica los datos, el rol, el estado y, opcionalmente, la contraseña y los datos laborales
	de una cuenta. Solo para los roles de gestión."""
	exigir_rol(*ROLES_GESTION)
	comprobar_gestionable(usuario)

	doc = frappe.get_doc("User", usuario)
	rol_actual = rol_principal({r.role for r in doc.roles})
	nombre, apellidos, telefono = limpiar_datos(nombre, apellidos, telefono, rol, rol_actual)

	doc.first_name = nombre
	doc.last_name = apellidos
	doc.mobile_no = telefono
	doc.enabled = 1 if cint(activo) else 0
	if password:
		doc.new_password = password

	# Si cambia el rol, se sustituyen los roles de la aplicación; el resto (System Manager…) se mantienen
	if rol != rol_actual:
		doc.set("roles", [r for r in doc.roles if r.role not in ROLES_APP])
		for r in ROLES_ASIGNABLES[rol]:
			doc.append("roles", {"role": r})

	doc.save(ignore_permissions=True)
	guardar_datos_laborales(usuario, posicion, salario_anual, horas_semanales)


@frappe.whitelist(methods=["POST"])
def eliminar_empleado(usuario):
	"""Borra de la base de datos una cuenta. Solo para los roles de gestión."""
	exigir_rol(*ROLES_GESTION)
	comprobar_gestionable(usuario)

	try:
		# Los datos laborales enlazan con la cuenta: se borran antes para que no la bloqueen
		if frappe.db.exists(DOCTYPE_LABORAL, usuario):
			frappe.delete_doc(DOCTYPE_LABORAL, usuario, ignore_permissions=True)
		frappe.delete_doc("User", usuario, ignore_permissions=True)
	except frappe.LinkExistsError:
		frappe.throw(
			"No se puede eliminar la cuenta porque hay registros vinculados a ella. "
			"Desactívala en su lugar."
		)
