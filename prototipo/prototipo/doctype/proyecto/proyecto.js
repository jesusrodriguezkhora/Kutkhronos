const TIPOS_SUELTOS = ["Licitación", "Contrato menor", "Acuerdo marco", "Subvención"];

function aplicarReglas(frm) {
	// Un proyecto suelto no puede ser contrato basado
	if (!frm.doc.acuerdo_marco) {
		frm.set_df_property("tipo", "options", TIPOS_SUELTOS.join("\n"));
	}
}

async function heredarDelAcuerdo(frm) {
	// Al crear un contrato basado desde Connections, rellenar ya lo que hereda
	if (!frm.is_new() || !frm.doc.acuerdo_marco) return;
	const { message } = await frappe.db.get_value("Proyecto", frm.doc.acuerdo_marco, ["cliente"]);
	frm.set_value({
		tipo: "Contrato basado",
		cliente: message.cliente,
	});
}

frappe.ui.form.on("Proyecto", {
	setup(frm) {
		// Solo empleados y coordinadores activos (la regla de verdad está en proyecto.py)
		frm.set_query("responsable", () => ({
			query: "prototipo.api.responsables.buscar_responsables",
		}));
	},

	refresh(frm) {
		aplicarReglas(frm);
		heredarDelAcuerdo(frm);

		if (!frm.is_new() && frm.doc.estado !== "Cerrado") {
			frm.add_custom_button("Cerrar proyecto", () => {
				frm.set_value("estado", "Cerrado");
				frm.save();
			});
		}
	},

	tipo(frm) {
		aplicarReglas(frm);
	},
});
