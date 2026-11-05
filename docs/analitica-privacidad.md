# Analítica opcional de Vitruvius y Vitruvia

## Estado
La instrumentación está incorporada a `index.html`, `vitruvia.html` y `bibliotheca-graeca-latina.html`, pero **no envía datos** hasta registrar un proyecto y colocar su identificador real en `assets/analytics-config.js`.

## Activación sin servidor propio
1. Crear una cuenta gratuita en https://cloud.umami.is/signup y registrar el dominio `diegoalonsok-png.github.io`.
2. Copiar el identificador de sitio (`data-website-id`) del código de seguimiento oficial.
3. Editar exclusivamente `websiteId` en `assets/analytics-config.js`. No incorporar contraseñas, claves API ni tokens secretos en GitHub.
4. Publicar por GitHub Pages y consultar el panel privado de Umami. Filtrar páginas por sus rutas /index.html, /vitruvia.html y /bibliotheca-graeca-latina.html.
5. Verificar una visita de prueba y una búsqueda de Vitruvia en el panel. La información no es retroactiva.

## Métricas permitidas
- Vistas de página, sesiones, procedencia general según configuración de Umami.
- Evento `site_search` **sin término buscado**.
- Evento `search_completed` con duración por rangos, sin datos textuales.
- Evento `image_gallery` sin imágenes buscadas ni enlaces.
- Evento `academic_reader` al abrir recursos desde Bibliotheca, sin títulos ni rutas de documentos.

## Privacidad y restricciones
- `data-exclude-search` y `data-exclude-hash` impiden registrar las cadenas de búsqueda que aparezcan en la URL.
- `data-do-not-track` respeta la preferencia DNT expuesta por el navegador.
- El rastreador solo se activa para `diegoalonsok-png.github.io`; no envía estadísticas desde `file://`, localhost ni otras instalaciones.
- No existe identificador individual adicional, analítica de archivos PDF locales ni grabación de pantalla.
- El navegador o una extensión puede bloquear la telemetría; los datos son estimaciones de uso y no un censo perfecto.
- Antes de activar, revisar el aviso de privacidad y comunicar el proveedor de analítica a visitantes.

## Validación
`node scripts/test-privacy-analytics.mjs`

Para medir todas las páginas secundarias haría falta extender la carga del instrumento. Esta primera fase controla las tres entradas principales del proyecto.
