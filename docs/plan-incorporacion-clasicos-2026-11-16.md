# Próxima incorporación de originales grecolatinos — control editorial (2026-11-16)

Estado: **plan de adquisición, no catálogo de obras incorporadas**. No deben aparecer como textos indexados hasta que se descargue un original real, se coteje su procedencia y exista archivo consultable. La consulta al registro `data/classics-corpus/search-registry.json` detectó 292 entradas y 227 work IDs (las entradas pueden representar lenguas distintas). Evitar duplicar los textos ya existentes (Homero, Platón, Aristóteles, Heródoto, Tucídides, Euclides, Estrabón, Dioscórides, etc.).

| Prioridad | Obra original | Lengua | Motivo | Estado |
|---|---|---|---|---|
| 1 | Sexto Empírico, *Pyrrhoniae hypotyposes* | grc | filosofía, teoría del conocimiento | fuente por localizar / licencia y edición por verificar |
| 2 | Proclo, *In primum Euclidis Elementorum librum commentarii* | grc | historia de la geometría y matemática antigua | fuente por localizar |
| 3 | Papo de Alejandría, *Collectiones mathematicae* | grc | matemática y construcción | fuente por localizar |
| 4 | Isidoro de Sevilla, *Etymologiae* | la | vocabulario técnico y transmisión medieval | fuente por localizar |
| 5 | Prisciano, *Institutiones grammaticae* | la | análisis morfológico latino | fuente por localizar |
| 6 | Casiodoro, *Institutiones* | la | transmisión de las artes liberales | fuente por localizar |
| 7 | Macrobio, *Commentarii in Somnium Scipionis* | la | cosmología y ciencia tardoantigua | comprobar primero cobertura en catálogo y textos externos |
| 8 | Vitruvio, testimonios adicionales y comentarios renacentistas de dominio público | la | recepción y variantes de *De architectura* | consultar inventario previo para evitar duplicados |

## Reglas para cada alta
1. Identificador estable de obra y autor; comprobar alias y títulos en griego/latín.
2. Fuente reproducible y licencia de transcripción; guardar URL original, edición, editor, fecha, idioma y checksum SHA-256 del archivo, más tamaño en bytes.
3. R2: subir original sin sobrescribir ninguna clave existente; registrar checksum de retorno y comprobar lectura.
4. GitHub: crear manifiesto e índice por obra; no copiar originales ya alojados en R2 si el visor puede leerlos mediante URL estable.
5. Indexación: tokenización preservando forma diplomática, normalización paralela (no destructiva), índice por locus, búsqueda literal/flexible y correspondencia autor-obra.
6. Publicación: ficha y visor solamente después de comprobar rutas R2/GitHub y al menos una consulta de prueba. Traducciones automáticas etiquetadas, nunca identificadas como traducción editorial.

## Aparato comparado
Existe nueva capa léxica automática en `assets/comparative-triad-loci.js` que lee los 731 loci de Kurilo V514, Krohn 1912 y Rose 1899. Sus diferencias **no** equivalen a variantes ecdóticas verificadas. Los 24 loci sin entrada documental siguen pendientes de cotejo impreso. Mantener siglas y nomenclatura Budé que utiliza el sitio.
