import frappe
from frappe.rate_limiter import rate_limit
from frappe.utils import cint, escape_html, validate_email_address

from prototipo.correo import enviar_correo
from prototipo.hooks import app_title
from prototipo.roles import ROLES_APP

MENSAJE = "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña."


def plantilla(nombre, enlace, minutos):
	caducidad = f"<p>El enlace caduca en {minutos} minutos.</p>" if minutos else ""
	return f"""
	<div style="font-family: Arial, sans-serif; max-width: 520px; color: #11221e;">
		<h2 style="color: #274941;">{app_title}</h2>
		<p>Hola, {escape_html(nombre)}:</p>
		<p>Hemos recibido una solicitud para restablecer tu contraseña. Pulsa el botón para elegir una nueva:</p>
		<p style="margin: 28px 0;">
			<a href="{enlace}" style="background: #274941; color: #ffffff; padding: 12px 22px;
			   border-radius: 8px; text-decoration: none; font-weight: bold;">Restablecer contraseña</a>
		</p>
		{caducidad}
		<p>Si no has sido tú, ignora este correo: tu contraseña no cambiará.</p>
		<p style="color: #578e81; font-size: 12px;">Este es un correo automático, no respondas a él.</p>
	</div>
	"""


@frappe.whitelist(allow_guest=True, methods=["POST"])
@rate_limit(key="email", limit=3, seconds=60 * 60)
def solicitar_recuperacion(email=None):
	"""Envía un enlace para restablecer la contraseña. Responde siempre lo mismo, exista o no la cuenta."""
	email = (email or "").strip().lower()

	if email and validate_email_address(email):
		usuario = frappe.db.get_value(
			"User", {"name": email, "enabled": 1}, ["name", "first_name"], as_dict=True
		)
		# Solo cuentas de la aplicación (no Administrator ni usuarios del Desk)
		if usuario and set(frappe.get_roles(usuario.name)) & set(ROLES_APP):
			try:
				user_doc = frappe.get_doc("User", usuario.name)
				# Mismo flujo que frappe.core.doctype.user.user.reset_password (Frappe 16),
				# pero sin enviar el correo de Frappe: el enlace lo enviamos nosotros
				user_doc.validate_reset_password()
				enlace = user_doc._reset_password(send_email=False)
				segundos = cint(frappe.db.get_single_value("System Settings", "reset_password_link_expiry_duration"))
				enviar_correo(
					usuario.name,
					f"{app_title}: restablecer contraseña",
					plantilla(usuario.first_name or usuario.name, enlace, segundos // 60),
				)
			except Exception:  # noqa: BLE001
				frappe.log_error(title="Recuperación de contraseña: error al enviar el correo")

	return {"mensaje": MENSAJE}