# Prototipo

App de Frappe que extiende ERPNext con DocTypes propios y un frontend React (SPA) servido por el propio Frappe.

## Contenido del repositorio
```
prototipo/
├── prototipo/
│   ├── hooks.py                  # Integración con Frappe (incluye la ruta de la SPA)
│   └── prototipo/doctype/
│       └── proyecto/             # DocType Proyecto: modelo (JSON), controlador (py), formulario (js)
└── dashboard/                    # SPA React (Vite + Tailwind + frappe-react-sdk), servida en /dashboard
```

Este repositorio contiene solo el código de la app. No incluye:

Frappe ni ERPNext — tienen sus propios repositorios oficiales.
Configuración de sites (sites/) — contiene credenciales; cada desarrollador tiene la suya.
Datos — viven en la base de datos de cada site, no en git.
Versiones
Componente	Rama
frappe	version-16
erpnext	version-16

Usa estas mismas versiones en tu entorno. Con versiones distintas, los DocTypes y el código pueden comportarse de forma diferente.

## Requisitos
Docker
VS Code con la extensión Dev Containers
git configurado con una cuenta de GitHub con acceso a este repositorio
Instalación del entorno de desarrollo

Paso 1 — Entorno base con frappe_docker

bash
git clone https://github.com/frappe/frappe_docker.git
cd frappe_docker
cp -R devcontainer-example .devcontainer
cp -R development/vscode-example development/.vscode

Abre la carpeta frappe_docker en VS Code y acepta Reopen in Container. En el terminal del contenedor:

bash
cd /workspace/development
python installer.py

Esto crea el bench en frappe-bench/ y el site development.localhost. Comprueba las versiones:

bash
cd /workspace/development/frappe-bench
bench --site development.localhost list-apps

Paso 2 — Instalar esta app

bash
bench get-app https://github.com/TU_USUARIO/prototipo.git
bench --site development.localhost install-app prototipo

get-app clona el repositorio en apps/prototipo; install-app crea en la base de datos del site las tablas de los DocTypes a partir de sus JSON.

El repositorio es privado: si get-app pide credenciales, usa un Personal Access Token de GitHub como contraseña.

Paso 3 — Configuración local del site

bash
bench --site development.localhost set-config developer_mode 1
bench --site development.localhost set-config ignore_csrf 1
bench --site development.localhost clear-cache
developer_mode — necesario para que los cambios en DocTypes hechos desde el Desk se guarden como ficheros en la app.
ignore_csrf — necesario para que la SPA funcione con el servidor de Vite en desarrollo.

Nunca actives ignore_csrf en producción.

Paso 4 — Dependencias de la SPA

bash
cd apps/prototipo/dashboard
yarn install
Arranque

Usa dos terminales dentro del contenedor:

bash
### Terminal 1 — Frappe (desde frappe-bench)
bench start

### Terminal 2 — SPA (desde apps/prototipo/dashboard)
yarn dev
Interfaz	URL
Desk (administración)	http://development.localhost:8000/app
SPA React	http://development.localhost:8080

Usuario inicial: Administrator (contraseña por defecto del instalador: admin). La primera vez que entres al Desk tendrás que completar el asistente de configuración de ERPNext.

Entra siempre por development.localhost y no por localhost: Frappe elige el site según el nombre de host.

Tu site empieza vacío: los datos de otros desarrolladores no están en el repositorio. Crea tus propios datos de prueba.

## Reglas del proyecto
No modificar el código de frappe ni de erpnext. Toda personalización va en esta app, mediante hooks.
Las reglas de negocio van en el controlador Python (validate, etc.), no solo en el frontend: la API no pasa por el JS del formulario ni por la SPA.
No subir al repositorio sites/, backups de la base de datos, node_modules ni credenciales.
