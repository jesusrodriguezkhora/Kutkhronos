import frappe
import requests


def enviar_correo(destinatario, asunto, html):
	"""Envía un correo a través del Noreply Mail Engine de Khora.

	Si el site no tiene configurado noreply_api_url y está en modo desarrollador,
	no envía nada: muestra el correo en el terminal de bench start.
	"""
	url = frappe.conf.get("noreply_api_url")

	if not url:
		if frappe.conf.get("developer_mode"):
			print(f"\n[correo de desarrollo] Para: {destinatario}\nAsunto: {asunto}\n{html}\n", flush=True)
			return
		raise Exception("Falta configurar noreply_api_url en el site.")  # noqa: TRY002

	respuesta = requests.post(
		url,
		json={"to_email_address": destinatario, "subject": asunto, "html_body": html},
		timeout=15,
	)
	respuesta.raise_for_status()