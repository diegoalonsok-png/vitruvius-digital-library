# Cotejo y aparato crítico

Fecha: 15 de noviembre de 2026.

Las ediciones V514 (castellano), V554 (francés) y V297 (inglés) contienen texto latino, traducción y notas. Sus notas y aparatos se conservan con identificación de edición. V297 posee menos aparato crítico y conserva notas explicativas. Las tres versiones de un mismo editor no son tres testimonios manuscritos independientes.

## Referencias y nomenclatura

Se emplean libro, capítulo y párrafo, con `praef.` para los prefacios. Las páginas y líneas siempre indican la edición fuente. Las convenciones latinas comunes a las ediciones críticas —compatibles con la tradición Budé— son `lemma ] lectio`, `om.`, `add.`, `corr.`, `coni.`, `suppl.`, `secl.`, `transp.`, `a.c.` y `p.c.`. No se atribuye una nomenclatura única a todos los volúmenes de Budé.

`Rose` designa a V. Rose, 1899; `Kr.` a F. Krohn, 1912; `Kur.` exige identificar V514, V554 o V297. `Bud.` solo puede emplearse para una lectura comprobada indicando volumen, editor, año y página. Las siglas de códices se interpretan dentro del conspectus de cada edición. La letra `x` de Rose conserva el significado que él le asigna; no es un nuevo códice del proyecto.

La [presentación oficial del libro I de Budé, editado por Philippe Fleury](https://www.lesbelleslettres.com/livre/9782251013497/de-l-architecture-livre-i) informa de una colación completa de quince manuscritos. No se ha medido la proporción de loci con entrada de aparato de sus volúmenes. Adoptar sus convenciones no acredita por sí solo una cobertura o una recensio equivalentes.

## Evidencia

| Evidencia | Publicación permitida | Límite |
| --- | --- | --- |
| OCR de una edición o de H | Instrumento de búsqueda y localización, identificado como pendiente | No convertir errores de reconocimiento en variantes |
| Transcripción digital del aparato de Rose | Registro documental con página, línea y atribución `secundum Rose` | La vinculación automática al locus y la transcripción necesitan cotejo con el impreso |
| Entrada cotejada visualmente con el impreso | Lectura editorial indirecta con identificador de comprobación | No equivale a autopsia del códice citado por el editor |
| Lectura directa de H | Registro separado con folio, cara, imagen y lectura explícita | No atribuir otras manos, fechas o correcciones sin comprobarlas |
| Decisión editorial del proyecto | Lema, testimonios, justificación y registro de decisión | No elevar una diferencia de OCR o una mera importación a decisión ratificada |

El aparato muestra por defecto las entradas expresamente cotejadas con el impreso. El registro documental completo se consulta mediante un filtro separado y declara su estado pendiente. La comprobación se registra por identificadores de entrada; no se certifica toda una página por haber leído una sola nota.

## Registro sistemático de Rose

El generador `scripts/build-rose-critical-register.mjs` importa la transcripción de Project Gutenberg 51812, con huella SHA-256, y conserva página, línea, texto y contexto de las notas. No crea variantes por semejanza de palabras ni adjudica lecturas manuscritas propias. Los signos superpuestos se expresan como `[a supra b]`; los superíndices, como `^c`. Para su disposición tipográfica se consulta la fuente.

Se registran 3.638 entradas editoriales de 282 páginas, vinculadas automáticamente a 717 de los 731 loci canónicos del proyecto. Son entradas, no un recuento de variantes independientes: una nota puede contener varias lecturas o una referencia. Hay 24 entradas sin locus asignado, 22 con interpolación de línea ambigua y una línea que cruza un límite de sección. Las tres referencias canónicas sin ancla propia en la segmentación de Rose se preservan: I.1.18, VI.7.6 y VI.7.7. No se fusionan ni se completan mediante conjetura.

Estos totales miden documentación disponible. La cifra de lecturas autópticas ratificadas no aumenta al importar Rose. El registro de comprobaciones del impreso está en `data/apparatus/source-print-checks.json`; distingue los PDF fuente, sus huellas y las entradas o pasajes efectivamente revisados.

## Erratas y preservación

Las erratas de los libros se distinguen de los fallos del visor y de la traducción automática. Cada corrección exige forma impresa, forma corregida, fuente y localización. Una nota de V297 en I.4.3 explica por error `exsurgendo`; su texto latino y los impresos cotejados de Rose y Krohn leen `exsugendo`. Se registra la corrección de la explicación sin sustituir silenciosamente la edición histórica.

Las correcciones graves que afecten a los libros requieren una edición nueva de DOCX y PDF, conservando los originales y verificando su composición. El porcentaje global de errores no se estima a partir de una muestra pequeña ni se usa para minimizar un error que cambie el sentido de un pasaje.

Se cotejaron individualmente 18 notas de Rose y se construyeron comparaciones atribuidas de I.4.3–6, con imágenes de Rose pp. 15–16 y Krohn pp. 14–15. En V297, I.4.4 se documenta además la omisión de la cláusula `a refrigerationibus solidantur` en ambas versiones inglesas y la fusión incorrecta de dos construcciones en su comentario. El encabezado `6.` de los párrafos 2136–2137 del DOCX permite localizar I.4.6; no se considera un pasaje ausente por no llevar el prefijo completo `1.4.6`.
