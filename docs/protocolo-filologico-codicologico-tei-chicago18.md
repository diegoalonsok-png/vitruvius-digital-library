# Protocolo universitario para fichas de obras y manuscritos clásicos

**Vitruvius Digital Library · versión de trabajo 2026-11-10.** Referentes metodológicos: *Cambridge Libraries Medieval Manuscripts* (descripción TEI); *Yale University Library Manuscript Cataloging Guidelines* (DCRM(MSS), identificación de manuscritos); TEI P5 `msDesc`, `msIdentifier`, `msContents`, `physDesc`, `history`, `additional`; estilo bibliográfico *Chicago Manual of Style*, 18.ª ed. Esta adopción es de criterios públicos de descripción: **no** implica revisión, afiliación, certificación ni aval de Yale o Cambridge.

## 1. Tres planos independientes de autoridad

- **Obra / texto:** autoridad de autor (o anonimato), título uniforme en lengua original y títulos alternativos, datación intelectual, género, lengua, identificadores de obra (TLG/PHI/CPG/CPL/BHG/BHL/CTS, solo si están acreditados).
- **Testimonio material / códice:** biblioteca y colección, signatura vigente completa, *siglum* de la edición (solo si está documentado), fecha y prueba de datación, soporte, extensión, dimensiones, escritura, foliación, loci efectivamente presentes, lagunas, origen, procedencia, bibliografía crítica.
- **Reproducción digital / edición / traducción:** URL de catálogo, visor de folios **realmente accesible** y su tipo, manifiesto IIIF **realmente probado**, derechos, estado de transcripción, edición utilizada y citas. Un enlace de catálogo **no** equivale a facsímil; una traducción no equivale al testigo manuscrito.

## 2. Forma de la referencia de manuscrito

**Ciudad, institución propietaria, fondo / colección, signatura; folios; fecha; siglum crítico documentado.**

Ejemplo: **Jerusalén, Biblioteca del Patriarcado Ortodoxo Griego, Παναγίου Τάφου 54 (H), ff. 76–81 (según Pinakes), 1056**.

- Mantener formas griegas y latinas originales con Unicode y acentuación acreditada.
- **Siglum** no es sinónimo de signatura física o de número de Pinakes; diferenciar `H`, `Pinakes diktyon 35291`, `CPG 1735` (identificador de la obra) y URL de reproducción.
- Datación: `1056` (colofón); `s. IV ex.` (paleografía, siglo IV final); `s. XVI 3/4` (tercer cuarto, con fuente). Acompañar siempre de paráfrasis en español cuando corresponda.
- Foliación: `f.` (folio), `ff.` (folios), `r` (recto), `v` (verso), pero no imponer `r/v` cuando el catálogo solo verifica un intervalo de folios.
- **Estado crítico:** `documentado`, `lectura hipotética`, `sin prueba de primer testimonio conservado`, `facsímil no localizado`, `pendiente de collatio`. Evitar términos absolutos sin revisión de bibliografía material y textual.

## 3. Correspondencia esquemática con TEI P5

| Campo de Vitruvius | TEI P5 (referencia de modelado) |
|---|---|
| custodio, localidad, fondo y signatura | `msIdentifier`: `settlement`, `repository`, `collection`, `idno` |
| título / obra en el manuscrito | `msContents` / `msItem`: `title`, `locus` |
| soporte, material, extensión, escritura | `physDesc`, `objectDesc`, `supportDesc`, `handDesc` |
| datación y origen | `history` / `origin`: `origDate`, `origPlace` |
| historia de posesión | `history` / `provenance` |
| bibliografía y facsímiles | `additional`, `bibl`, `surrogates` |
| sigla, identificador y locus de edición | metadatos críticos declarados; no confundir con `msIdentifier` |

**Advertencia:** los campos JSON descriptivos actuales no equivalen por sí solos a una exportación TEI-XML validada. Su transformación y validación serán una fase aparte.

## 4. Secuencia de auditoría del catálogo vigente (271 obras al 14-11-2026)

1. Verificar obra, título original, atribución, límites del texto, fuentes de edición y CTS/TLG/PHI/CPG cuando corresponda.
2. Buscar **cada** manuscrito pertinente en bibliotecas propietarias y catálogos de autoridad (Pinakes/IRHT, Manuscripta, BnF, Vaticano, British Library, Bodleian, e-codices, Cambridge, LoC, etc.), registrando la signatura institucional.
3. Distinguir **testimonio material más antiguo localizado**, **más antiguo conservado globalmente (solo con bibliografía que lo sustente)**, **testigo completo más antiguo**, **apógrafos / descripti**, **fragmentos** y **versiones indirectas**.
4. Confirmar enlace: `visor institucional de folios`, `microfilme institucional`, `imágenes externas` o `registro sin imágenes`; indicar el estado sin prometer visores inexistentes.
5. Contrastar texto y foliación; bibliografía Chicago 18 y fuente de cada atribución; guardar fecha y reservas de auditoría.
6. Revisar en tandas sucesivas sin borrar registros, códices o folios anteriores; diferenciar cobertura documentada de trabajo pendiente.

## 5. Tanda piloto: Didaché (3 testimonios griegos)

| Testigo | Signatura e identificador | Datación / tipo | Acceso |
|---|---|---|---|
| **P. Oxy. XV 1782** | Oxford, P. Oxy. XV 1782; TM 64596 / 4CARE 260 | s. IV ex.; dos hojas fragmentarias de pergamino | [4CARE](https://4care-skos.mf.no/4care-artefacts/260/) · [fotografías externas](https://commons.wikimedia.org/wiki/Category:Papyrus_Oxyrhynchus_1782) |
| **Codex Hierosolymitanus 54 (H)** | Jerusalén, Παναγίου Τάφου 54; Pinakes 35291; CPG 1735 (obra) | 1056; texto completo, ff. 76–81 según Pinakes | [Pinakes](https://pinakes.irht.cnrs.fr/notices/cote/35291/) · [microfilme LoC](https://www.loc.gov/item/00279389694-jo/) |
| **Elbasan 82** | Tirana, Kodikët e Shqipërisë 488, Dosja 082; Pinakes 63441 | s. XVI 3/4; completo, probable apógrafo de H | [Pinakes](https://pinakes.irht.cnrs.fr/notices/cote/63441/) · [Guida](https://pinakes.irht.cnrs.fr/notices/bibliographie/S8XN5V7D/) — sin visor público verificado |

Un **manuscrito completo** no prueba que sobreviva en él el texto original íntegro tal como fue compuesto; la terminación del texto antiguo puede estar discutida.

## 6. Fuentes de norma

- [Cambridge Libraries, Medieval Manuscripts — About](https://medieval.lib.cam.ac.uk/about).
- [Yale University Library, Manuscript Cataloging Guidelines](https://web.library.yale.edu/book/export/html/2197).
- [TEI P5, Manuscript Description](https://tei-c.org/release/doc/tei-p5-doc/en/html/MS.html).
- [Pinakes, H54](https://pinakes.irht.cnrs.fr/notices/cote/35291/).
- [Guida, nuevo testigo de la Didaché, Pinakes](https://pinakes.irht.cnrs.fr/notices/bibliographie/S8XN5V7D/).
- [4CARE, P. Oxy. XV 1782](https://4care-skos.mf.no/4care-artefacts/260/).
- [Library of Congress, Panagios Taphos 54](https://www.loc.gov/item/00279389694-jo/).

## 7. Auditor automático Python de las 222 fichas (sin consumo de almacenamiento multimedia)

**Archivo:** `scripts/codicology_auditor.py`. **Pruebas:** `tests/test_codicology_auditor.py`. **GitHub Actions:** `.github/workflows/codicology-self-audit.yml`.

- Cada ejecución **recorre las 222 fichas** y las compara contra las signaturas individuales del registro. Calcula obras con testigos, número de testimonios, visores declarados y problemas de datos.
- La búsqueda externa se distribuye en tandas de **24 obras por ejecución diaria** (salvo cambio explícito). Proveedores iniciales: [Library of Congress, API JSON](https://www.loc.gov/apis/json-and-yaml/) y [BnF, API Gallica SRU](https://api.bnf.fr/api-gallica-de-recherche). Pinakes y Biblissima intervienen como **repertorios académicos de referencia**, no se finge una API pública no acreditada.
- **Primera revisión:** URL HTTPS, procedencia institucional, signatura, título uniforme y variantes del título, lengua del testimonio, distinción entre texto original y traducción antigua, datación, cobertura, enlaces a imágenes y metadatos IIIF. La comprobación de manifest obtiene **únicamente metadatos**, no imágenes de páginas.
- **Veedor independiente:** comprueba candidatos hallados y **veta** toda incorporación con signatura no documentada, datación ausente, título equívoco, visor no demostrado o corroboración insuficiente. Los resultados del buscador quedan en `quarantine.json`.
- **No hay modificación automática de catálogo**. Se generan `latest-audit.json`, `summary.json` y `quarantine.json` como artefactos temporales de GitHub Actions, sin escribir en la rama `main`. Una ficha cambia únicamente tras auditoría editorial de la fuente. Esto evita que un algoritmo reemplace un códice correcto por uno de otra obra.
- **Almacenamiento:** prohibido incluir imágenes, digitalizaciones, escaneos, PDFs o facsímiles en el trabajo automatizado. Solo JSON de metadatos pequeños y enlaces hacia bibliotecas propietarias. El tamaño de las respuestas remotas está limitado.
- **Costes:** ejecutable con Python 3.11 y biblioteca estándar; no requiere TinyFish, servicios pagos, claves privadas ni servidores externos persistentes.
- **Límites:** el hecho de que un enlace responda no demuestra contenido ni corrección filológica; ni un nombre coincidente, ni un manifiesto válido, ni un siglum conocido prueban por sí solos que exista una lectura textual verificable. Los hallazgos automáticos no sustituyen colación directa, inspección de facsímiles o bibliografía especializada.

### Ejecución manual reproducible

```bash
python -m unittest discover -s tests -p 'test_codicology_auditor.py' -v
python scripts/codicology_auditor.py --output reports/codicology
python scripts/codicology_auditor.py --live --batch-size 24 --output reports/codicology
```

La tercera orden utiliza conexión a Internet y puede informar `unavailable` por rate limiting o bloqueos del proveedor. Los resultados de red inciertos no se traducen en una decisión sobre la existencia del códice. El archivo `reports/codicology` **no se publica como código permanente**: es un artefacto temporal de auditoría.

## 8. Lista mínima de campos académicos por obra

| Categoría | Campos visibles y estado de evidencia |
|---|---|
| **Autoridad intelectual** | Autor normalizado, atribución, título original en griego/latín, título uniforme, variantes y rubricas manuscritas |
| **Identificación normalizada** | TLG / PHI / CTS / CPG / CPL / BHG / BHL, pero solo cuando los identificadores se hayan contrastado; cualquier candidato se marca como tal |
| **Filología** | Composición, autoría discutida, lengua, género, organización en libros/capítulos, extensión conservada, recensiones y tradiciones indirectas |
| **Ecdótica** | Edición base, criterios de constitutio textus, lecciones, variantes, omisiones, adiciones, conjeturas, loci, aparato crítico y bibliografía |
| **Codicología** | Siglum editorial, custodio, signatura, fecha y fundamento, pergamino/papiro/papel, extensión, tamaño, foliación, escritura, manos, cuadernos y lagunas |
| **Historia del testimonio** | Lugar de copia (solo si se conoce), procedencia, antiguos propietarios, restauraciones, hallazgo y referencia catalográfica |
| **Facsímil** | Enlace a visor institucional, manifiesto IIIF, enlace de catálogo y fuente alternativa; tipo de enlace y derechos claramente visibles |
| **Control de confianza** | Identificado materialmente / metadatos comprobados / cotejado con transcripción publicada / colacionado autópticamente / pendiente |
| **Accesibilidad** | Enlaces externos individuales, rotulado de fragmentos, ubicación por folio y aviso si no hay visor público verificable |

Los campos se presentan **cuando existe evidencia**; un campo ausente se interpreta como `pendiente de verificación`, nunca se completa por inferencia del siglo, de la obra o de la biblioteca.
