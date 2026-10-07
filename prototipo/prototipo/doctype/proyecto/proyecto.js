// Copyright (c) 2026, aaaa and contributors
// For license information, please see license.txt

frappe.ui.form.on("Proyecto", {
	estado(frm) {
		if (frm.doc.estado !== "Abierto" && !frm.doc.fecha_inicio) {
			frm.set_value("fecha_inicio", frappe.datetime.get_today());
		}
	},

	refresh(frm) {
		if (!frm.is_new() && frm.doc.estado !== "Cerrado") {
			frm.add_custom_button("Cerrar proyecto", () => {
				frm.set_value("estado", "Cerrado");
				frm.save();
			});
		}
	},
});
