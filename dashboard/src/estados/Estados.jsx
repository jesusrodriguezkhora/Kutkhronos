import { Route, Routes } from "react-router-dom";
import Buscador from "./Buscador";
import EstadoProyecto from "./EstadoProyecto";

// Módulo Estados: /estados es el buscador; /estados/<código> es el estado de ese proyecto
export default function Estados() {
  return (
    <Routes>
      <Route index element={<Buscador />} />
      <Route path=":codigo" element={<EstadoProyecto />} />
    </Routes>
  );
}