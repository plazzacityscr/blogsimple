# BlogSimple

Este repositorio contiene un proyecto mínimo de sitio web tipo blog estático con una interfaz de administración que permite crear, editar y eliminar artículos en formato Markdown. El objetivo del documento es transferir todo el conocimiento necesario para que un programador o una inteligencia artificial pueda continuar el desarrollo o mantener el proyecto en otro momento.

Estado actual del proyecto
- Estructura básica creada y funcional: generación estática, administración en el cliente y una API local para pruebas.
- Soporte de dos modos de persistencia:
	- Modo remoto: uso de la API de GitHub para crear/editar/eliminar ficheros en el repositorio (requiere token con permisos).
	- Modo local: servidor local mínimo que permite escribir ficheros directamente en el contenedor para pruebas sin acceso a GitHub.
- Funcionalidades implementadas:
	- Listado de artículos en el panel administrativo.
	- Crear y editar artículos con frontmatter en YAML y contenido Markdown.
	- Subida de imágenes y referencias en el contenido.
	- Gestión básica de categorías y usuarios mediante ficheros JSON.
	- Script de generación estática que convierte `blog/*.md` en `docs/` (carpeta lista para publicar en GitHub Pages).

Estado pendiente y riesgos conocidos
- No se ha realizado tratamiento seguro de contraseñas: se utiliza MD5 por simplicidad. Esto supone un riesgo de seguridad para entornos reales; se recomienda migrar a bcrypt o Argon2 con sal.
- Almacenamiento del token de GitHub en localStorage no es seguro para producción. En desarrollo es aceptable, pero en producción debe usarse un servidor seguro para firmar peticiones o flujos OAuth.
- La interfaz de usuario requiere mejoras de experiencia, validaciones y manejo de errores más robusto.
- No existe control de versiones interno de los artículos salvo la gestión de GitHub. Si desea historial en modo local, habrá que implementar un mecanismo adicional.

Estructura de ficheros relevante
- `admin/` — páginas administrativas: `login.html`, `dashboard.html`, `new.html`, `edit.html`, `categories.html`, `users.html`.
- `assets/js/` — scripts del cliente: `config.js`, `github-api.js`, `admin-post.js`.
- `assets/css/` — estilos: `style.css`.
- `blog/` — artículos en Markdown con frontmatter.
- `images/` — imágenes subidas por los artículos.
- `data/` — datos auxiliares: `users.json`, `categories.json`, `blog_index.json`.
- `scripts/` — utilidades: `build.js` (genera `docs/`) y `local-api-server.js` (servidor local de persistencia para pruebas).
- `docs/` — salida del build, lista para publicar en GitHub Pages.
- `.github/workflows/build.yml` — flujo de trabajo que ejecuta el build en pushes a la rama principal.

Formato de los artículos
Cada artículo es un fichero Markdown en `blog/` con frontmatter YAML al inicio. Campos usados:
- `title`: título del artículo.
- `date`: fecha (cadena ISO o fecha legible).
- `slug`: identificador url-friendly (sin extensión).
- `excerpt`: entradilla o resumen corto.
- `categories`: lista de categorías.
- `image`: nombre de la imagen destacada (archivo en `images/`).

Ejemplo de frontmatter:
```
---
title: "Ejemplo de artículo"
date: "2025-11-04"
slug: "ejemplo-articulo"
excerpt: "Entradilla de ejemplo."
categories:
	- ejemplo
image: "ejemplo-destacada.jpg"
---

Contenido Markdown...
```

Cómo ejecutar el proyecto en desarrollo
Requisitos mínimos:
- Node.js >= 18.
- npm.

Instalación de dependencias:

```bash
cd /workspaces/blogsimple
npm install
```

Generar la web estática (build):

```bash
npm run build
```

Servir la carpeta del proyecto para probar la interfaz estática (puerto 8000):

```bash
python3 -m http.server 8000 --bind 0.0.0.0
```

Arrancar el servidor local de persistencia (modo de desarrollo para pruebas sin GitHub):

```bash
node scripts/local-api-server.js
# El servidor por defecto escucha en el puerto 9000; puede cambiar con LOCAL_API_PORT
```

Abrir la interfaz administrativa en el navegador:

```
http://127.0.0.1:8000/admin/login.html
```

Credenciales para pruebas locales
- Usuario: `admin`
- Contraseña: `admin`

Nota sobre token de GitHub
- En el formulario de login existe un campo para introducir un token personal de GitHub. Si se introduce, la interfaz usará la API de GitHub para persistir cambios (crear/actualizar/eliminar ficheros). Si no se introduce token, la interfaz empleará el servidor local (si está en ejecución) para guardar y eliminar ficheros dentro del workspace, lo cual resulta útil en entornos de desarrollo o cuando no se desee modificar el repositorio remoto.

Despliegue en GitHub Pages
- El script `scripts/build.js` genera la carpeta `docs/` con la versión estática del sitio. El flujo de trabajo en `.github/workflows/build.yml` ejecuta el build y realiza un commit de `docs/` a la rama principal; GitHub Pages puede configurarse para servir desde la carpeta `docs/` de la rama principal.

Configuración a revisar antes de continuar
- `assets/js/config.js`: actualizar `OWNER` y `REPO` con el usuario y nombre del repositorio en GitHub si se va a usar la persistencia remota.
- `data/users.json`: gestionar usuarios y contraseñas (actualmente en MD5). Para agregar o cambiar usuarios, editar ese fichero o usar la interfaz administrativa `admin/users.html`.

Pautas para continuar el desarrollo (lista priorizada)
1. Seguridad
	 - Migrar hash de contraseñas a bcrypt o Argon2 y añadir sal. Actualizar páginas de creación/edición de usuario.
	 - Evitar almacenamiento de token en localStorage: implementar un servicio intermedio seguro o flujo OAuth para ediciones remotas.
2. Calidad del código y pruebas
	 - Añadir pruebas unitarias y de integración para `scripts/build.js` y `scripts/local-api-server.js`.
	 - Añadir linters y formateadores (eslint, prettier) y ejecutar en el flujo de trabajo.
3. Mejora de la experiencia de usuario
	 - Validaciones en formularios, mensajes de error claros y confirmaciones para operaciones destructivas.
	 - Previsualización WYSIWYG opcional para Markdown.
4. Robustez del modo remoto
	 - Mejor manejo de errores de la API de GitHub, paginación, límites de tasa y reintentos.
	 - Soportar subida de imágenes en varios formatos y limitar tamaño.
5. Despliegue y CI
	 - Configurar GitHub Pages para servir desde `docs/` y verificar que el workflow tiene permisos adecuados.
	 - Añadir test de smoke en la acción para validar que `docs/` se generó correctamente.

Tareas concretas pendientes (tareas que facilitan la continuación)
- Implementar autenticación segura del lado servidor o flujo OAuth para editar mediante la interfaz web.
- Añadir la gestión de roles si fuera necesario (por el momento todos los usuarios tienen los mismos permisos).
- Mejorar el parser y writer de frontmatter para soportar YAML completo (por ahora se usa un parser sencillo).
- Añadir control de versiones local o registro de cambios para los artículos (si se desea historial fuera de Git).
- Añadir pruebas automatizadas y añadir pasos de lint y test al workflow de GitHub Actions.

Referencias dentro del repositorio (dónde mirar primero)
- `scripts/build.js` — conversor Markdown → HTML para la salida `docs/`.
- `scripts/local-api-server.js` — servidor local para pruebas de persistencia; documentarlo y proteger rutas si se usa fuera de contenedor.
- `assets/js/github-api.js` — capa cliente que abstrae entre modo local y modo GitHub.
- `assets/js/admin-post.js` — lógica de formularios de creación/edición de artículos.
- `admin/*.html` — interfaces administrativas.
- `data/*.json` — datos de usuarios, categorías e índice local.

Comandos útiles
- Instalar dependencias:
	```bash
	npm install
	```
- Ejecutar build:
	```bash
	npm run build
	```
- Iniciar servidor estático para pruebas:
	```bash
	python3 -m http.server 8000 --bind 0.0.0.0
	```
- Iniciar servidor local de persistencia:
	```bash
	node scripts/local-api-server.js
	```

Contacto y seguimiento
Si aparece un problema sin solución clara, lo mejor es revisar los ficheros indicados en el apartado "Referencias dentro del repositorio" y reproducir el flujo en local: iniciar el servidor estático y el servidor local de persistencia, abrir `/admin/login.html` y revisar la consola del navegador y los logs en `/tmp/local-api.log` o en la salida del servidor.

Resumen final
El proyecto ya incluye un prototipo funcional que permite administrar artículos y generar la web estática. Para pasar a un estado de producción conviene priorizar seguridad (hash de contraseñas y gestión segura de tokens) y pruebas automáticas. En el README se han incluido los pasos, la estructura y la lista de tareas pendientes para una transferencia de conocimiento efectiva.
