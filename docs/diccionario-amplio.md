# Diccionario latino-griego incorporado: estado de construcción

El léxico selectivo anterior **no** es un diccionario amplio. El diccionario offline se genera con `scripts/build-classical-dictionary.py`, tomando todas las formas efectivamente usadas en los tres corpus y buscando sus lemas en las descargas JSONL de Wiktextract para **Latin** y **Ancient Greek** (https://kaikki.org/dictionary/Latin/index.html y https://kaikki.org/dictionary/Ancient%20Greek/index.html).

Pasos para publicar: descargar las dos colecciones JSONL de la fuente, ejecutar `python scripts/build-classical-dictionary.py --latin Latin.jsonl.gz --greek AncientGreek.jsonl.gz`, revisar la salida `data/classical-dictionary.json`, sus tamaños y licencias, y confirmar cobertura con ensayos aleatorios de términos vitruvianos. El cliente carga el fichero **solo si existe**; si no, continúa con el léxico selectivo y la consulta en línea.

**Estado actual:** generador y adaptador del navegador incorporados, pero el archivo generado de miles de entradas todavía NO está publicado. No declarar el diccionario amplio como activo hasta subir y ensayar ese archivo.

Wiktionary: CC BY-SA/GFDL según los datos; reconocer autoría y atribución, respetar la licencia de obras derivadas. El sistema no debe confundir acepción lexicográfica con ocurrencia dentro del tratado ni mostrar una elección morfológica ambigua como única.
