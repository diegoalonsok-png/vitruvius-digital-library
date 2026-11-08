# Regla de conservación e indexación académica

Vigente desde 8 de noviembre de 2026.

## Inalterabilidad

Se conservan **íntegros** el sitio Vitruvius Digital Library, sus páginas y buscadores, todos los códices y folios, todas las imágenes de manuscritos y los documentos históricos; no se borran, renombran ni sustituyen archivos existentes durante trabajos de indexación. Son especialmente inmutables las ediciones originales de Vitruvio (V514, V554, V297), sus tres estructuras JSON y el manifiesto de procedencia. Las intervenciones filológicas se documentan en nuevos registros de decisiones o auditorías, nunca reescribiendo silenciosamente los originales.

## Política temporal de capacidad

Hasta que exista alojamiento adicional confirmado, no se incorporan archivos nuevos **PDF, DOC, DOCX u ODT** al repositorio; tampoco se reemplazan archivos de esos formatos ya alojados. Las traducciones que ya existen siguen accesibles, sin ocultarlas ni borrarlas. Las nuevas obras griegas se ofrecen en **griego** y las latinas en **latín**, con acceso a edición externa acreditada si procede. No se exige traducción para catalogar o indexar un original.

Las fuentes griegas y latinas indexadas deben tener procedencia académica verificable, autor, obra, edición identificada, URL o URN cuando exista, sección/verso/locus, idioma y límites de cobertura. Una ficha bibliográfica, una digitalización de folios, una búsqueda externa y una transcripción textual **no** se cuentan como la misma cosa. Las colaciones ecdóticas se distinguen de simples coincidencias del buscador; no se afirma verificación autóptica sin cotejo real.

## Ampliación segura

Prioridad: indexar los **originales** griegos y latinos que falten dentro del margen técnico disponible, o vincular ediciones accesibles en bibliotecas académicas sin duplicar el PDF. Se conserva siempre la capacidad de lectura del texto original. Cuando GitHub Pages no admita nuevas fuentes voluminosas, detener la carga; no reducir el sitio existente ni eliminar sus códices para liberar espacio.

El control automatizado `scripts/guard-library-assets.mjs` rechaza borrados de cualquier archivo, modificaciones dentro de `images/` y `documents/`, cambios a los tres JSON de ediciones madre y nuevas cargas/modificaciones PDF/DOC/DOCX/ODT. El flujo `.github/workflows/protect-library-assets.yml` comprueba cambios en PR y registra alertas en pushes. Para bloquear la fusión en todos los casos es necesario configurar la verificación como obligatoria en las reglas de rama de GitHub.
