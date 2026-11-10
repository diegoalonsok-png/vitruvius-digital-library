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

## 4. Secuencia de auditoría de 222 registros

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
