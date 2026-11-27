import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { NOMBRE_APP } from "../lib/marca";
import logo from "../images/Khora_Symbol_CMYK.svg";
import { IconoCerrar, IconoChevronAbajo, IconoSalir } from "../componentes/Iconos";

// Retardos del hover (ms): al entrar evita que el menú se abra al cruzarlo de paso con el ratón;
// al salir evita que se cierre si el ratón sale un instante del borde
const RETARDO_ABRIR = 80;
const RETARDO_CERRAR = 200;
// Ancho del menú expandido en px (clase md:w-64)
const ANCHO_EXPANDIDO = 256;

// Una ruta pertenece a una categoría si empieza por su prefijo
const dentroDe = (ruta, pathname) => pathname === ruta || pathname.startsWith(`${ruta}/`);

const iniciales = (nombre = "") =>
  nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");

// --- Estilos compartidos ---
// Los iconos quedan siempre en la misma posición (centrados en la columna contraída de 72 px):
// al expandir solo aparecen los textos, sin que nada se desplace.

const claseElemento = (activo) =>
  `flex h-10 w-full items-center gap-3 rounded-lg px-3.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-salvia ${
    activo ? "bg-white/10 text-white" : "text-white/65 hover:bg-white/5 hover:text-white"
  }`;

// Texto que aparece al expandir el menú (y se oculta, sin ocupar clics, al contraerlo)
const claseTexto = (expandido) =>
  `whitespace-nowrap transition-[opacity,visibility] duration-150 ${
    expandido ? "visible opacity-100 delay-75" : "pointer-events-none invisible opacity-0"
  }`;

// --- Elementos del menú ---

function EnlacePagina({ pagina, expandido }) {
  const Icono = pagina.icono;
  return (
    <li>
      <NavLink to={pagina.ruta} end title={expandido ? undefined : pagina.etiqueta} className={({ isActive }) => claseElemento(isActive)}>
        {({ isActive }) => (
          <>
            <Icono className={`h-5 w-5 shrink-0 ${isActive ? "text-salvia" : ""}`} />
            <span className={`truncate ${claseTexto(expandido)}`}>{pagina.etiqueta}</span>
          </>
        )}
      </NavLink>
    </li>
  );
}

function Categoria({ categoria, abierta, onPulsar, expandido }) {
  const { pathname } = useLocation();
  const activa = dentroDe(categoria.ruta, pathname);
  const Icono = categoria.icono;
  const visible = abierta && expandido;
  const idLista = `menu-${categoria.clave}`;

  return (
    <li>
      <button
        type="button"
        onClick={onPulsar}
        aria-expanded={visible}
        aria-controls={idLista}
        title={expandido ? undefined : categoria.etiqueta}
        // Contraído, la categoría de la página actual se resalta; expandida, solo si está plegada
        className={claseElemento(activa && !visible)}
      >
        <Icono className={`h-5 w-5 shrink-0 ${activa ? "text-salvia" : ""}`} />
        <span className={`flex-1 truncate text-left ${activa ? "text-white" : ""} ${claseTexto(expandido)}`}>
          {categoria.etiqueta}
        </span>
        <IconoChevronAbajo
          className={`h-4 w-4 shrink-0 transition-[transform,opacity] duration-150 ${abierta ? "" : "-rotate-90"} ${
            expandido ? "opacity-60" : "opacity-0"
          }`}
        />
      </button>

      {/* Páginas de la categoría: se despliegan con una transición de altura (grid 0fr → 1fr) */}
      <div
        id={idLista}
        className={`grid transition-[grid-template-rows,opacity,visibility] duration-200 ease-out ${
          visible ? "visible grid-rows-[1fr] opacity-100" : "invisible grid-rows-[0fr] opacity-0"
        }`}
      >
        <ul className="min-h-0 overflow-hidden" inert={!visible}>
          <li className="h-1" aria-hidden="true" />
          {categoria.hijos.map((h) => (
            <li key={h.clave} className="ml-[1.375rem] border-l border-white/10 pl-3">
              <NavLink
                to={h.ruta}
                className={({ isActive }) =>
                  `relative my-px flex h-9 items-center rounded-lg px-3 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-salvia ${
                    isActive
                      ? "bg-white/10 font-semibold text-white before:absolute before:-left-[13px] before:top-1.5 before:h-6 before:w-0.5 before:rounded-full before:bg-salvia"
                      : "text-white/60 hover:bg-white/5 hover:text-white"
                  }`
                }
              >
                <span className="truncate whitespace-nowrap">{h.etiqueta}</span>
              </NavLink>
            </li>
          ))}
          <li className="h-1" aria-hidden="true" />
        </ul>
      </div>
    </li>
  );
}

// --- Menú lateral ---

// Menú lateral de la aplicación.
// - Escritorio: contraído (solo iconos) por defecto. Se expande al pasar el ratón, al pulsar un
//   icono (pantallas táctiles) o al entrar con el teclado, y se contrae al salir. Expandido se
//   superpone al contenido: la página no cambia de ancho.
// - Móvil: cajón que se abre con el botón de la barra superior (abiertoMovil), siempre expandido.
// - Las categorías empiezan todas plegadas; las despliega el usuario.
export default function BarraLateral({ navegacion, nombre, rol, abiertoMovil, onCerrarMovil, onCerrarSesion }) {
  const { pathname } = useLocation();
  const aside = useRef(null);
  const temporizador = useRef(null);

  const [hover, setHover] = useState(false); // ratón encima
  const [fijado, setFijado] = useState(false); // abierto por clic/toque o con el teclado
  const [abiertas, setAbiertas] = useState([]);

  const expandido = hover || fijado || abiertoMovil;

  const programar = (fn, ms) => {
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(fn, ms);
  };
  useEffect(() => () => clearTimeout(temporizador.current), []);

  // Tras elegir una página con el ratón, el menú se contrae y no vuelve a expandirse hasta que el
  // ratón salga del menú y vuelva a entrar. Al contraerse, el menú suele quedar fuera del cursor sin
  // que el usuario lo mueva: solo cuenta como salir llevar el ratón fuera de la zona que ocupa el
  // menú expandido (ANCHO_EXPANDIDO) o fuera de la ventana.
  const bloqueado = useRef(false);
  const quitarDesbloqueo = useRef(() => {});
  useEffect(() => () => quitarDesbloqueo.current(), []);

  const bloquearHover = () => {
    quitarDesbloqueo.current();
    bloqueado.current = true;
    const desbloquear = () => {
      bloqueado.current = false;
      quitarDesbloqueo.current();
    };
    const alMover = (e) => e.pointerType === "mouse" && e.clientX > ANCHO_EXPANDIDO && desbloquear();
    const alSalirDeVentana = (e) => !e.relatedTarget && desbloquear();
    document.addEventListener("pointermove", alMover);
    document.addEventListener("mouseout", alSalirDeVentana);
    quitarDesbloqueo.current = () => {
      document.removeEventListener("pointermove", alMover);
      document.removeEventListener("mouseout", alSalirDeVentana);
    };
  };

  // Hover solo con ratón: en pantallas táctiles el toque también dispara eventos "pointer"
  const alEntrar = (e) =>
    e.pointerType === "mouse" && !bloqueado.current && programar(() => setHover(true), RETARDO_ABRIR);
  const alSalir = (e) => {
    if (e.pointerType !== "mouse") return;
    programar(() => {
      setHover(false);
      setFijado(false);
    }, RETARDO_CERRAR);
  };

  // Abierto por toque o teclado: se cierra al tocar fuera, con Escape o al cambiar de página
  useEffect(() => {
    if (!fijado) return;
    const alTocarFuera = (e) => !aside.current?.contains(e.target) && setFijado(false);
    const alPulsar = (e) => {
      if (e.key !== "Escape") return;
      setFijado(false);
      setHover(false);
      document.activeElement?.blur();
    };
    document.addEventListener("pointerdown", alTocarFuera);
    document.addEventListener("keydown", alPulsar);
    return () => {
      document.removeEventListener("pointerdown", alTocarFuera);
      document.removeEventListener("keydown", alPulsar);
    };
  }, [fijado]);

  useEffect(() => setFijado(false), [pathname]);

  // Teclado: al entrar con Tab se expande; al salir del menú, se contrae
  const alEnfocar = (e) => e.target.matches(":focus-visible") && setFijado(true);
  const alDesenfocar = (e) => !aside.current?.contains(e.relatedTarget) && setFijado(false);

  // Pulsar un enlace (una página, no una categoría): el menú se contrae al momento
  const alPulsarEnlace = (e) => {
    if (!e.target.closest("a")) return;
    clearTimeout(temporizador.current);
    if (hover) bloquearHover(); // abierto con el ratón: no reabrir hasta salir y volver
    setHover(false);
    setFijado(false);
  };

  // Pulsar una categoría: si el menú está contraído (toque), lo expande y la despliega;
  // si ya está expandido, la despliega o la pliega
  const pulsarCategoria = (clave) => {
    if (!expandido) {
      setFijado(true);
      setAbiertas((a) => (a.includes(clave) ? a : [...a, clave]));
      return;
    }
    setAbiertas((a) => (a.includes(clave) ? a.filter((c) => c !== clave) : [...a, clave]));
  };

  return (
    <>
      {/* Hueco fijo del menú contraído en escritorio: el contenido nunca cambia de ancho */}
      <div aria-hidden="true" className="hidden w-[4.5rem] shrink-0 md:block" />

      {/* Fondo oscuro del cajón en móvil */}
      <div
        aria-hidden="true"
        onClick={onCerrarMovil}
        className={`fixed inset-0 z-40 bg-salvia-950/50 transition-opacity md:hidden ${
          abiertoMovil ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        ref={aside}
        aria-label="Menú principal"
        onPointerEnter={alEntrar}
        onPointerLeave={alSalir}
        onClick={alPulsarEnlace}
        // Pantallas táctiles (sin hover): el primer toque en el menú contraído lo expande
        onPointerDown={(e) => e.pointerType !== "mouse" && !expandido && setFijado(true)}
        onFocus={alEnfocar}
        onBlur={alDesenfocar}
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col overflow-hidden bg-salvia-900 text-white transition-[transform,width,box-shadow] duration-200 ease-out md:translate-x-0 ${
          abiertoMovil ? "translate-x-0" : "-translate-x-full"
        } ${expandido ? "md:w-64 md:shadow-2xl md:shadow-salvia-950/30" : "md:w-[4.5rem]"}`}
      >
        {/* Marca */}
        <div className="flex h-16 shrink-0 items-center gap-3 px-[1.125rem]">
          <Link to="/" className="flex min-w-0 items-center gap-3" aria-label={`${NOMBRE_APP}: inicio`}>
            <img src={logo} alt="" className="h-9 w-9 shrink-0" />
            <span className={`truncate text-lg font-bold tracking-tight ${claseTexto(expandido)}`}>{NOMBRE_APP}</span>
          </Link>
          <button
            type="button"
            onClick={onCerrarMovil}
            aria-label="Cerrar el menú"
            className="ml-auto grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white md:hidden"
          >
            <IconoCerrar className="h-5 w-5" />
          </button>
        </div>

        {/* Navegación: desplazamiento vertical solo si no cabe, con barra fina (ver index.css) */}
        <nav aria-label="Secciones" className="scroll-discreto flex-1 overflow-y-auto overflow-x-hidden px-3 py-4">
          <ul className="space-y-1">
            {navegacion.map((e) =>
              e.hijos ? (
                <Categoria
                  key={e.clave}
                  categoria={e}
                  abierta={abiertas.includes(e.clave)}
                  onPulsar={() => pulsarCategoria(e.clave)}
                  expandido={expandido}
                />
              ) : (
                <EnlacePagina key={e.clave} pagina={e} expandido={expandido} />
              )
            )}
          </ul>
        </nav>

        {/* Usuario y cierre de sesión, siempre abajo. Contraído: solo el avatar */}
        <div className="shrink-0 border-t border-white/10 px-[1.125rem] py-3">
          <div className="flex items-center gap-3">
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-salvia text-sm font-bold text-salvia-950"
              title={expandido ? undefined : nombre}
              aria-hidden="true"
            >
              {iniciales(nombre)}
            </span>
            <div className={`min-w-0 flex-1 ${claseTexto(expandido)}`}>
              <p className="truncate text-sm font-semibold">{nombre}</p>
              {rol && <p className="truncate text-xs text-white/50">{rol}</p>}
            </div>
            <button
              type="button"
              onClick={onCerrarSesion}
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
              tabIndex={expandido ? 0 : -1}
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white ${claseTexto(
                expandido
              )}`}
            >
              <IconoSalir className="h-5 w-5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
