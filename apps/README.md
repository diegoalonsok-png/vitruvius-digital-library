# Vitruvius Digital Library como aplicación (Android e iOS)

El sitio ya es una **aplicación web instalable (PWA)**: `manifest.webmanifest`, `sw.js`
(funciona sin conexión con lo ya consultado), iconos en `assets/app-icons/` y capturas en
`assets/app-screens/`. A partir de ella se generan los paquetes para las tiendas sin
reescribir el sitio: cada cambio publicado en GitHub Pages llega a las aplicaciones.

## 1. Instalación directa (sin tienda)

- **Android (Chrome):** abrir el sitio → menú ⋮ → *Instalar aplicación*.
- **iPhone/iPad (Safari):** abrir el sitio → *Compartir* → *Añadir a pantalla de inicio*.

## 2. Google Play (Android)

Método recomendado: **PWABuilder** (genera una *Trusted Web Activity* firmada).

1. Entrar en <https://www.pwabuilder.com> e indicar
   `https://diegoalonsok-png.github.io/vitruvius-digital-library/`.
2. *Package for stores* → **Android** → identificador sugerido
   `io.github.diegoalonsokpng.vitruvius` → descargar el paquete (AAB + APK + clave de firma).
   Guardar la clave (`signing.keystore`) y sus contraseñas: sin ellas no se pueden publicar actualizaciones.
3. El paquete incluye `assetlinks.json`. **Debe publicarse en la raíz del dominio**:
   `https://diegoalonsok-png.github.io/.well-known/assetlinks.json`, es decir, en el repositorio
   `diegoalonsok-png/diegoalonsok-png.github.io` (no en este proyecto). Sin ese archivo la aplicación
   funciona, pero muestra la barra de dirección de Chrome. En este repositorio se deja la plantilla
   `apps/assetlinks.template.json`.
4. Cuenta de desarrollador de Google Play (pago único) → crear la aplicación → subir el AAB.

## 3. App Store (iPhone/iPad)

1. En PWABuilder → *Package for stores* → **iOS** → descargar el proyecto Xcode.
2. Se necesita una Mac con Xcode y una cuenta del Apple Developer Program (cuota anual).
3. Abrir el proyecto, ajustar el *Bundle Identifier* (`io.github.diegoalonsokpng.vitruvius`),
   firmar con el equipo de desarrollo y enviar a App Store Connect.
4. Apple revisa que la aplicación aporte más que una página web (directriz 4.2): conviene destacar
   en la ficha la lectura sin conexión, el lector bilingüe, el Codex H por folios, la carpeta de
   investigación y el diccionario griego/latino.

## 4. Datos para la ficha de las tiendas

- **Nombre:** Vitruvius Digital Library · **Nombre corto:** Vitruvius
- **Categoría:** Educación / Libros y referencia
- **Descripción breve:** Vitruvio, De architectura: códices, ediciones históricas, traducciones y buscador académico.
- **Iconos:** `assets/app-icons/icon-512.png`, `maskable-512.png`, `icon-1024.png` (App Store).
- **Capturas:** `assets/app-screens/*.jpg`.
- **Política de privacidad:** el sitio no usa cuentas; la carpeta de investigación y las preferencias
  se guardan solo en el dispositivo (almacenamiento local del navegador).

## 5. Qué funciona sin conexión

Las páginas, textos, datos y PDF ya abiertos quedan guardados en el dispositivo (hasta 400
imágenes/PDF; los más antiguos se reemplazan). Las fuentes externas de Vitruvia (Wikipedia,
Crossref, OpenAlex, catálogos) y los visores IIIF de las bibliotecas requieren conexión.
