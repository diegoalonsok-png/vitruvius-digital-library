# Lectura académica e incorporación de clásicos

El lector textual comparte presentación, navegación por loci y comparación PDF
para todas las obras registradas compatibles. La disposición Budé sitúa la
traducción a la izquierda y el original a la derecha; el usuario puede invertirla.
La estructura de lectura no atribuye a la biblioteca una edición de la CUF.

## Notas de las fuentes

`scripts/build-classics-reading-notes.py` recupera notas explícitas de TEI cuya
huella SHA-256 coincide con la registrada en el corpus. Cada nota separada debe
pertenecer íntegramente a una coincidencia exacta del pasaje importado. Se conserva
el texto importado íntegro tanto en el corpus sin modificar como en el registro
auxiliar. Los índices auxiliares no crean variantes ni normalizan siglas de los
editores. Las referencias bibliográficas no se presentan como variantes textuales.

La primera incorporación verifica 72 ediciones y contiene 20.851 entradas de nota
vinculadas a unidades de lectura; las ventanas solapadas pueden citar la misma
nota de fuente más de una vez. Las fuentes cuya huella difiere se registran como
no incorporadas, sin sustituir el texto previamente publicado.

## Descarga, digitalización e índices

Los flujos de incorporación preparan el texto antes de publicar la tanda:

1. Conservar el PDF o TEI y su identificación documental.
2. Extraer el texto de las páginas; aplicar Tesseract a las páginas sin texto
   suficiente, con modelos de griego antiguo, latín o la lengua de la edición.
3. Conservar cada página completa y registrar el método y las incidencias del OCR.
4. Generar un índice literal y un índice de correspondencias del diccionario
   multilingüe Conceptus, con anclas de página o loci propios de la edición.
5. Verificar PDF, texto e índice publicados por SHA-256 en las incorporaciones R2.
6. Integrar el índice compartido y publicar el catálogo solo si termina la tanda.

Los flujos TEI generan los índices léxico y Conceptus antes de su commit de
publicación. Las notas de una fuente TEI simple se extraen de los bytes ya
descargados. Los PDF locales generan su texto e índices por página antes del
commit de importación; diez PDF existentes ya disponen de estos índices.

Conceptus aplica correspondencias documentadas y formas normalizadas. No son
embeddings, lematización acreditada ni alineación filológica. Una página digital
es una referencia documental; no se convierte automáticamente en locus antiguo.

## Visores

El facsímil, su OCR y la traducción conservan la misma página digital. El visor
traduce páginas largas por fragmentos y etiqueta resultados incompletos o fallos
del proveedor. Puede corregirse un OCR de trabajo sin sobrescribir la lectura
importada. La comparación con otro PDF tiene paginación independiente. La búsqueda
en PDF externo depende de su capa textual; los índices de la biblioteca no se
atribuyen automáticamente a un archivo introducido por el usuario.

La disponibilidad remota y los fallos de fuentes locales tienen diagnósticos
separados. Las exclusiones externas expresas del índice Conceptus no invalidan el
índice local; tampoco se consideran prueba de que el objeto remoto esté accesible.

Los índices derivados de los PDF y su informe de cobertura se publican en `data/index/classics-pdf/`. Se conservan intactos los PDF, las transcripciones por página y el informe histórico original.
