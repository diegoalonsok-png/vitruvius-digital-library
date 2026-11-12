# Aparato crítico de las ediciones, extraído y vinculado al sitio

Qué se hizo el 11 de noviembre de 2026, por qué, y cómo se comprueba.

## El problema

Las ediciones impresas contienen un aparato crítico extenso que el sitio no podía
buscar. Medido: la *recensio* castellana tiene 1157 páginas y el extractor del
aparato sólo tocaba 128. El motivo era que `scripts/build-apparatus-index.py`
reconocía únicamente una lista cerrada de rótulos (`APARATO CRÍTICO`, `NOTA
ECDÓTICA`), de modo que quedaba afuera todo lo rotulado de otro modo.

En un muestreo de 14 páginas no extraídas, 4 contenían aparato: una nota sobre
*Euri venti*, una «Bibliografía (Referencia Crítica)» y un glosario terminológico
con *symmetria* y *utilitas* citando loci.

La edición inglesa (V297) es anterior y de otra arquitectura: rotula el aparato en
caja baja («Critical note», «Adopted reading») y no en versales. Por eso era la
peor servida de las tres.

## Lo que ahora se extrae

| | antes | ahora |
|---|---|---|
| Bloques del aparato | 582 | **1250** |
| Páginas de las ediciones alcanzadas | 350 | **511** |
| Bloques de la edición inglesa | 99 | **304** |
| Folios del códice H con locus | 21 | **53** |
| Variantes publicadas en `apparatus-criticus.html` | 0 | **144** |

Además, material que no estaba estructurado en ninguna parte:

- **803 unidades de comentario lematizado**, de las cuales **619 (77 %) con locus
  probado**: el lema se busca en el texto latino de la propia edición y, cuando la
  secuencia aparece en un único pasaje canónico, la atribución es reproducible.
- **159 lemas del glosario del autor**, 33 con equivalente griego y 32 en las tres
  lenguas, ahora consultables en `lexicon-vitruvianum.html`, que hasta aquí era
  sólo una concordancia de formas gráficas y declaraba no incluir glosas.
- **117 secciones de comentario** por locus, que dan locus explícito a los bloques.

## Cómo se evita publicar basura

La lectura de tablas de un PDF arrastra texto de columnas vecinas. Una entrada
mal leída atribuiría a un manuscrito una lectura que no tiene, de modo que se
publica sólo lo que pasa cuatro controles (`scripts/validate-collatio.py`):

1. **Doble fuente del autor.** La misma *collatio* está impresa en V514 y V554.
   La lectura latina de un testimonio no depende de la lengua de la edición, así
   que su coincidencia en ambas es una comprobación independiente. Se comparan
   sólo los tokens latinos, porque el vernáculo sangra distinto en cada lengua.
2. **Integridad de la transcripción.** Se aparta la celda con un folio dentro de
   una lectura, un locus incrustado o prosa vernácula en una lectura latina.
3. **Orden codicológico**, por subsecuencia no decreciente más larga. Un primer
   intento con un techo corriente fracasó: la primera entrada era errónea
   (`f. 1r → 3.3.7`), fijó el techo alto y apartó 114 entradas legítimas.
4. **Jerarquía de evidencia.** Una rúbrica vista en el facsímil vale más que una
   tabla leída de un PDF: se aparta lo que contradiga
   `data/codex-h/folio-locus-map.json` o sus límites de libro.

Resultado: 144 confirmadas, 162 en cola de revisión, publicadas como tal y no
como aparato. El control cruzado contra el mapa existente dio una concordancia
independiente en f. 1v (1.1.1) y detectó dos conflictos reales, apartados.

## Errores corregidos, preexistentes

- **El filtro de Budé nunca funcionó.** `/\bbud[eé]\b/i` no coincide con «Budé»:
  en JavaScript `\b` es frontera ASCII y `é` no es carácter de palabra. Eran 46
  notas invisibles al filtro. Corregido con un *lookahead* unicode.
- **El inventario filtraba 4 autoridades** de las 24 citadas. No se podía aislar
  *Gudianus* ni *Selestadiensis*, los otros manuscritos primarios, ni los
  editores modernos distintos de Krohn, Rose y Budé. Ahora el selector se puebla
  de los datos y se agrupa en manuscritos, ediciones críticas e impresas antiguas.
- **`check:reading-shelf`** exigía un `<link>` individual a una hoja que desde el
  empaquetado llega dentro de `assets/bundle-vitruvia-1.css`. Hecha consciente
  de los paquetes.
- **`check:vitruvia-100`** esperaba que «rey Tut» resolviera al apodo «Tut»,
  cuando el resolutor fue mejorado para devolver el faraón. Expectativa
  actualizada con su justificación.
- **El diccionario latino** no reconocía numerales (`xii`, `iiii` aditivo) ni
  recuperaba lemas de vocabulario técnico. Ahora propone un lema sólo si la forma
  emparentada existe en los datos atestiguados: `aedium`→*aedis*,
  `septentrionem`→*septentriones*; `diapente` y `lapidicinis`, sin pariente
  atestiguado, no devuelven nada en lugar de inventar.

## Reproducir

```
npm run build:aparato-autoral     # comentario lematizado y glosario, con anclaje de locus
npm run build:collatio            # lee el Apéndice T y lo valida
npm run build:folios-collatio     # amplía el mapa folio ↔ locus
npm run build:lexicon-auctoris    # consolida el glosario del autor
npm run build:index               # reconstruye data/apparatus-index.json
npm run check:collatio            # comprueba que la página publica sólo lo validado
```

## Publicación por grados

Tras la primera versión se decidió publicar el aparato completo y no sólo lo que
alcanzaba el grado máximo, que es la práctica normal en filología: cada entrada
declara su respaldo en lugar de quedar oculta.

| grado | entradas | qué significa |
|---|---|---|
| doble fuente | 142 | impresa en las dos ediciones con la misma lectura latina |
| fuente única | 93 | celda íntegra, sin par bilingüe que la confirme |
| transcripción por comprobar | 60 | la celda muestra arrastre de columna |
| orden dudoso | 8 | la atribución de folio rompe el orden del códice |
| conflicto con el facsímil | 3 | contradice el mapa verificado por inspección |

Al mapa folio ↔ locus pasan sólo los dos grados superiores: un folio equivocado
corrompería la navegación del facsímil. El mapa queda en **62 folios**.

### Dos errores propios, corregidos

- **Validación circular.** El validador contrastaba contra el mapa de folios que
  el fusionador escribe, de modo que la segunda corrida validó la collatio contra
  sus propios resultados: aparecieron 3 conflictos y la fusión dejó de ser
  idempotente. El control considera ahora sólo los folios verificados por
  inspección (`visual_rubric`, `visual_text`, `catalogue`, `provisional`).
- **Folios leídos de la prosa.** Una entrada atribuía 8.6.10 a los folios 1r y
  98r, tomados de la frase «77 loci textuales sustantivos de ff. 1r–98r se
  documentan…», que es un resumen del anexo y no una atribución. El folio se toma
  ahora de su propia columna, y un rango `ff. Xr–Yv` en prosa se descarta.

## Prosa analítica de las ediciones

La auditoría de cobertura (`npm run audit:cobertura`) mostró que las ediciones no
se reparten sólo entre texto latino y aparato. De 3379 páginas en las tres,
**1000 son prosa analítica**: estudio introductorio, valoración de las ediciones
críticas, *stemma codicum*, *restitutio vocabulorum*, *normae interpretationis*,
*status quaestionis*, excursus y aparato arqueológico comparativo. 35 secciones
identificadas, 492 páginas citando loci.

Se indexa en `data/apparatus/estudios-ediciones.json`, aparte del aparato y
rotulada como estudio —no es aparato ni traducción—, y se carga sólo cuando se la
busca, para que ninguna página arrastre 2 MB de más.

## Lo que sigue pendiente

- Las 162 entradas en cola de revisión necesitan comprobarse contra la página
  impresa citada; cada una lleva su motivo.
- La transcripción diplomática de los 32 folios nuevos sigue pendiente: lo que
  está registrado es la lectura que el autor consignó, no una transcripción
  verificada folio a folio.
- 184 unidades de comentario sin locus probado (lema en varios pasajes o no
  localizado) esperan desambiguación.
- `loci.html` sigue siendo una selección orientativa de unos 60 loci frente a los
  731 canónicos.
