"""Borra todos los proyectos de la pipeline (DocType Proyecto).

- Primero los contratos basados y después el resto, porque un acuerdo marco con basados no se puede borrar.
- TODO O NADA: si algún proyecto no se puede borrar, no se borra nada.
- Los clientes no se tocan.
- Los proyectos borrados quedan en "Deleted Document" y se pueden restaurar desde el Desk.
- Con dependientes=True vacía antes POR COMPLETO todos los DocTypes que enlazan Proyecto
  (planificación, imputación de horas, gastos directos...). Se borran directamente en la base
  de datos, sin hooks ni "Deleted Document": solo para resetear datos. En producción son
  datos reales.

Uso (desde frappe-bench). Por defecto es una SIMULACIÓN: borra todo y al final deshace los cambios.

    bench borrar-proyectos [--dependientes] [--guardar]
	
	Por ejemplo:
	bench borrar-proyectos --dependientes                                    # simula
    bench borrar-proyectos --dependientes --guardar                          # borra (pide confirmación)
"""
import frappe
from frappe.utils import strip_html


def doctypes_dependientes():
	"""DocTypes (no tablas hijas) que enlazan Proyecto, directamente o a través de una tabla hija."""
	con_enlace = set(frappe.get_all("DocField", filters={"fieldtype": "Link", "options": "Proyecto"}, pluck="parent"))
	con_enlace |= set(frappe.get_all("Custom Field", filters={"fieldtype": "Link", "options": "Proyecto"}, pluck="dt"))

	resultado = set()
	for doctype in con_enlace:
		if frappe.get_meta(doctype).istable:
			resultado.update(
				frappe.get_all(
					"DocField",
					filters={"fieldtype": ["in", ["Table", "Table MultiSelect"]], "options": doctype},
					pluck="parent",
				)
			)
		else:
			resultado.add(doctype)
	resultado.discard("Proyecto")
	return sorted(resultado)


def vaciar(doctype):
	"""Borra todos los registros de un DocType y de sus tablas hijas, sin pasar por los controladores."""
	total = frappe.db.count(doctype)
	for campo in frappe.get_meta(doctype).get_table_fields():
		frappe.db.delete(campo.options, {"parenttype": doctype})
	frappe.db.delete(doctype)
	return total


def borrar(simular=True, dependientes=False):
	# Los archivos adjuntos podrían borrarse del disco aunque la base de datos haga rollback,
	# así que con adjuntos la simulación no es segura.
	adjuntos = frappe.db.count("File", {"attached_to_doctype": "Proyecto"})
	if simular and adjuntos:
		print(f"\nHay {adjuntos} archivos adjuntos a proyectos: la simulación no es segura.")
		print("Haz un backup con --with-files y lanza el borrado real.\n")
		return {"borrado": False, "proyectos": 0, "errores": 0, "adjuntos": adjuntos}

	# 0. DocTypes que enlazan proyectos (solo si se pide)
	vaciados = {}
	if dependientes:
		for doctype in doctypes_dependientes():
			vaciados[doctype] = vaciar(doctype)

	# 1. Orden: contratos basados primero, después todo lo demás (incluidos los que no tengan tipo)
	todos = set(frappe.get_all("Proyecto", pluck="name"))
	basados = set(frappe.get_all("Proyecto", filters={"tipo": "Contrato basado"}, pluck="name"))
	orden = sorted(basados) + sorted(todos - basados)

	# 2. Borrar
	borrados, errores = 0, []
	for nombre in orden:
		try:
			frappe.delete_doc("Proyecto", nombre, ignore_permissions=True)
			borrados += 1
		except Exception as e:  # noqa: BLE001
			errores.append((nombre, strip_html(str(e)) or repr(e)))

	restantes = frappe.db.count("Proyecto")
	guardado = not simular and not errores
	if guardado:
		frappe.db.commit()
	else:
		frappe.db.rollback()

	# 3. Resumen
	if guardado:
		titulo = "BORRADO GUARDADO"
	elif simular:
		titulo = "SIMULACIÓN: no se ha borrado nada"
	else:
		titulo = "HAY ERRORES: no se ha borrado nada"
	print(f"\n{titulo}")
	if dependientes:
		print(f"  Registros dependientes {'borrados' if guardado else 'que se borrarían'}:")
		for doctype, total in vaciados.items():
			print(f"    {doctype}: {total}")
	print(f"  Proyectos encontrados:  {len(orden)} ({len(basados)} contratos basados)")
	print(f"  Proyectos {'borrados' if guardado else 'que se borrarían'}: {borrados}")
	print(f"  Restantes tras borrar:  {restantes}")
	print(f"  Errores:                {len(errores)}")
	for nombre, mensaje in errores:
		print(f"    {nombre}: {mensaje}")
	print()

	return {"borrado": guardado, "proyectos": borrados, "errores": len(errores), "dependientes": vaciados}