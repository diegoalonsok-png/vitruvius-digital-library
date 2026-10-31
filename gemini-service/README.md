# Scriptorium Gemini · prueba gratuita y optativa

**No hay un servicio Gemini activo por el mero hecho de publicar estos archivos.** Es necesario que el propietario despliegue el Worker, obtenga una API key del nivel gratuito (sin habilitar facturación de pago), y configure los secretos. Google puede cambiar modelos y cuotas; consultar [precios oficiales](https://ai.google.dev/gemini-api/docs/pricing).

## Puesta en marcha
1. Crear una clave en https://aistudio.google.com/apikey dentro de un proyecto que permanezca en la modalidad gratuita. **No habilitar pagos** para esta prueba.
2. Crear un Worker en Cloudflare Workers Free y pegar el contenido de `gemini-worker.js`.
3. Configurar dos secretos del Worker: `GEMINI_API_KEY` (clave Google) y `ACCESS_TOKEN` (una contraseña larga aleatoria para impedir uso indiscriminado).
4. Desplegar. Copiar la URL HTTPS del Worker (por ejemplo `https://nombre.usuario.workers.dev`).
5. En Scriptorium introducir la URL y el token de acceso (solo permanece en el campo durante la sesión), subir el folio JPG/PNG y pulsar **Extraer latín con Gemini IA**.

El secreto `GEMINI_API_KEY` no debe introducirse en la página ni en GitHub. El token de acceso enviado desde la página no es la clave de Google. HTTPS obligatorio. Nunca desplegar un proxy abierto sin autenticación, para evitar abuso o agotamiento de cuota.

**Restricciones:** la imagen se envía a Google; en el nivel gratuito Google puede usar contenido para mejorar productos. El resultado es una sugerencia de lectura sin validar, no una transcripción paleográfica certificada. Ficheros de entrada JPG/PNG/WebP hasta 6 MB. La aplicación muestra errores de cuota y no cambia a otro servicio silenciosamente. El modelo y su elegibilidad gratuita deben verificarse al desplegar, pues las condiciones cambian.

**Para la biblioteca pública:** el token compartido solo es apropiado para una prueba controlada por el propietario; antes de ofrecerlo al público, implementar autenticación, cuotas por usuario y controles de abuso.
