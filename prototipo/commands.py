"""Comandos de bench de Khronos.

    bench importar-proyectos <excel> [--hoja Hoja1] [--guardar]
    bench borrar-proyectos [--dependientes] [--guardar]

Sin --guardar, todo es una simulación. Ayuda: bench <comando> --help
"""
import os

import click
import frappe
from frappe.commands import get_site, pass_context


def _ejecutar(context, funcion, **kwargs):
	"""Conecta al site, ejecuta la función y sale con código 1 si hubo errores."""
	frappe.init(site=get_site(context))
	frappe.connect()
	try:
		resultado = funcion(**kwargs)
	finally:
		frappe.destroy()
	if isinstance(resultado, dict) and resultado.get("errores"):
		raise SystemExit(1)


def _ruta(ruta):
	"""Busca el Excel en el directorio actual y, si no está, en la carpeta que contiene el bench
	(en local, /workspace/development/). bench ejecuta los comandos desde sites/, por eso se usa $PWD."""
	if os.path.isabs(ruta):
		candidatas = [ruta]
	else:
		actual = os.environ.get("PWD", os.getcwd())
		padre_bench = os.path.dirname(frappe.utils.get_bench_path())
		candidatas = [os.path.join(actual, ruta), os.path.join(padre_bench, ruta)]

	for candidata in candidatas:
		if os.path.isfile(candidata):
			return candidata
	raise click.BadParameter("no existe el archivo. Buscado en:\n  " + "\n  ".join(candidatas))


@click.command("importar-proyectos")
@click.argument("excel")
@click.option("--hoja", default=None, help="Hoja del Excel (por defecto, la primera).")
@click.option("--guardar", is_flag=True, help="Guarda la importación. Sin esta opción solo simula.")
@pass_context
def importar_proyectos(context, excel, hoja, guardar):
	"""Importa en Khronos los proyectos del Excel limpio (todo o nada)."""
	from prototipo.migracion.importar_proyectos import importar

	kwargs = {"ruta": _ruta(excel), "simular": not guardar}
	if hoja:
		kwargs["hoja"] = hoja
	_ejecutar(context, importar, **kwargs)


@click.command("borrar-proyectos")
@click.option("--dependientes", is_flag=True, help="Vacía también planificación, imputaciones, gastos y demás DocTypes que enlazan proyectos.")
@click.option("--guardar", is_flag=True, help="Borra de verdad. Sin esta opción solo simula.")
@pass_context
def borrar_proyectos(context, dependientes, guardar):
	"""Borra todos los proyectos de la pipeline (todo o nada)."""
	from prototipo.migracion.borrar_proyectos import borrar

	if guardar:
		click.confirm(f"Se van a BORRAR todos los proyectos de {get_site(context)}. ¿Continuar?", abort=True)
	_ejecutar(context, borrar, simular=not guardar, dependientes=dependientes)


commands = [importar_proyectos, borrar_proyectos]