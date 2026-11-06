# Vitruvius Digital Library

## Interdisciplinary Greek and Latin teaching / Docencia clásica interdisciplinaria

This project has a specialized Vitruvian core and a broader **Bibliotheca Graeca et Latina** for students and researchers across classical philology, philosophy, history, literary studies, archaeology, ancient science and the history of ideas.

- [Interdisciplinary classroom gateway](docencia-clasica.html): discipline-based reading routes into existing Greek/Latin texts and translations; suitable for university seminars, not restricted to architectural history.
- [Bibliotheca Graeca et Latina](bibliotheca-graeca-latina.html): status-labelled catalogue, distinguishing locally readable texts, identified external sources and bibliography-only records.
- [Model source-critical reading](modelo-critico-prefacio.html): Harley MS 2767, f. 1r; separates facsimile, provisional semidiplomatic reading, editorial Latin and attributed translations. Not a definitive scholarly collation.
- [Reproducible technical checks](auditoria-tecnica.html): browser-delivered file/corpus checks plus 200 *unexecuted* Vitruvia regression queries for manual review. The checklist is not a test pass claim.
- [Specialized Roman architecture teaching guide](docencia-roma-antigua.html): seven existing seminars on Vitruvian passages.

Citation metadata and DOI references are already present in [CITATION.cff](CITATION.cff). Before asserting indexing, verify actual records in DataCite/OpenAIRE and inspect the corresponding registered metadata. The site's [sitemap.xml](sitemap.xml) is advertised in [robots.txt](robots.txt); Search Console ownership and submission are separate actions.


**Independent open-access research resource for Vitruvius' *De architectura*.**  
Editor and project lead: **Diego A. Kurilo**, architect and urbanist (Buenos Aires, Argentina).

**Website:** https://diegoalonsok-png.github.io/vitruvius-digital-library/index.html

## Vitruvia Lexicon (léxico, etimología, sintaxis y frases del mundo antiguo)

[Vitruvia Lexicon](vitruvia-lexicon.html) is reached from the **Lexicon** category in Vitruvia's search bar. It searches only Greek and Latin vocabulary, syntax and phrases, entirely in the browser over structured JSON indexes (no server):

- **Lexical entries**: form → lemma (CLTK for Latin; G. Celano's lemmatised Greek with AGDT morphology), Lewis & Short / LSJ senses (Perseus DL, CC BY-SA 4.0), attested forms, diachronic distribution by work, collocations and a KWIC concordance in which every word links to its own entry.
- **Etymologicum** (`data/lexicon/etymologicum.json`, 108 editorial entries): PIE roots, Old Latin forms with their epigraphic source (Duenos, Lapis Niger, Scipionic epitaphs, SC de Bacchanalibus…), Greek/Latin/Biblical Hebrew equivalents (Hebrew Bible · LXX · Vulgate), cognates, bibliography (de Vaan, Ernout–Meillet, Beekes, Chantraine, BDB, HALOT) and loci; on-demand Wiktionary etymology.
- **Search syntax**: `"exact phrase"`, `@lemma`, `aedi*`, `t?xis`, `~fuzzy`, `raíz:`, `A ..3 B`, `A NEAR/5 B`, Greek morphosyntactic patterns `[mood=ptc case=gen] [case=gen]`, Latin→Greek transliteration (`anthropos` → ἄνθρωπος) and phonetic/orthographic approximation (ae/e, ph/f, itacism).
- **Etymological tree** for any Latin, Greek, Spanish, English, French or German word (Wiktionary, built in the reader's browser: ancestors, borrowings, compounds, cognates, root descendants), with the editorial entry as fallback.
- **Historical figures**: modern names (typo-tolerant, e.g. `arquiedes`) are mapped to their Greek and Latin forms via the Onomasticon Vitruvianum and Wikidata, and searched in both corpora.
- **Operators**: `=aedes` / `sem:` trilingual equivalence search; `#geometria` thematic thesaurus (`data/lexicon/thesaurus.json`); `√בנה` Hebrew triconsonantal roots (`data/lexicon/hebrew-roots.json`, BDB/HALOT); visual query builder for Greek morphosyntax; interactive lemma disambiguation for ambiguous Latin forms.
- **Phrase tools**: sentence analyser (interlinear gloss, lemma, morphology, frequency), parallel passages by shared lemmas (TF-IDF), and *Sententiae* (53 phrases with canonical references, syntax notes and automatic verification against the local corpus).
- **Ecdotics and codicology**: collation workshop (LCS word alignment, negative and positive apparatus, variant-type classification, agreement matrix, TEI parallel-segmentation export); inline Kurilo apparatus and Rose/Krohn pages for every Vitruvian locus; *Instrumenta* (critical signs with TEI encoding, apparatus abbreviations, scribal-error typology, Lachmann–Maas–Pasquali–Bédier principles, codicology, medieval abbreviations).
- **Hermeneutics and exegesis**: lemmatic exegetical notebook (eight levels, stored locally) exportable to Markdown, JSON and XML-TEI.
- **Open data and citation**: every entry, concordance and analysis exports to CSV, JSON and XML-TEI; citations in Chicago, APA, MLA and BibTeX; Schema.org `DefinedTermSet` / `DefinedTerm` markup; virtual keyboards for polytonic Greek, Biblical Hebrew and Latin quantities; Gentium Book Plus / Cardo / Noto web fonts.

Data build: `python3 scripts/build-vitruvia-lexicon.py && python3 scripts/render-vitruvia-lexicon-page.py`. Integrity test: `python3 scripts/test-vitruvia-lexicon.py` (all citations attributed to local works are verified literally in the corpus). Lemmatisation is automatic and must be checked in context; the editorial etymologies summarise the cited reference works.

## Research atlases

- [Atlas Geographicus Vitruvianus — ancient Latin/Greek place names, modern equivalents, map and loci](atlas-geographicus.html)
- [Atlas Iconographicus Vitruvianus — historical folios, IIIF sources, codicological and bibliographic descriptions](iconografia-vitruviana.html)

Both tools use explicit provenance and uncertainty labels; geographical map pins do not assert monument coordinates, and book-level image classifications are not individual iconographic identifications.

## Citable editions (2026) · DOI & full text

Each of Diego A. Kurilo's three editorial works has a distinct, crawlable bibliographic landing page, persistent Zenodo DOI and open-access PDF. These records describe the works; inclusion in search engines or Google Scholar is determined by their external crawlers and is **not guaranteed**.

| Edition | Academic record with PDF | Persistent identifier |
| --- | --- | --- |
| V514 · Latin–Spanish provisional recension | [Bibliographic record](documents/edicion-v514.html) | [DOI 10.5281/zenodo.23884757](https://doi.org/10.5281/zenodo.23884757) |
| V554 · Latin–French provisional recension | [Notice bibliographique](documents/edicion-v554.html) | [DOI 10.5281/zenodo.23885110](https://doi.org/10.5281/zenodo.23885110) |
| V297 · English-language reading and research edition | [Bibliographic record](documents/edicion-v297.html) | [DOI 10.5281/zenodo.23885404](https://doi.org/10.5281/zenodo.23885404) |

**Project DOI:** [10.5281/zenodo.23868911](https://doi.org/10.5281/zenodo.23868911).

**Scientific cooperation and institutional support:** [Collaborations dossier](colaboraciones.html). Distinguishes documented external resource mentions from endorsements, partnerships, and financial sponsorship; none is implied by a reference link.

### Vatican Library manuscripts

[Selective Vatican manuscript bibliography](codices-vaticanos.html) lists Urb. lat. 293, Arch. Cap. S. Pietro H.34, Reg. lat. 1328, 1504 and 2079 with catalogue links and explicit rights conditions. Vatican Apostolic Library images are *not* copied to this project; online republication requires permission from the rights holder.

### Historical facsimile reading rooms

- [Harleianus 2767 — H](harleianus.html): manuscript witness.
- [Editio princeps Sulpizio da Veroli c.1486–1487 — S](sulpizio-1486.html): 205 folio images; Bayerische Staatsbibliothek, Munich.
- [Fra Giocondo 1511 — G](giocondo-1511.html): 254 IIIF images from e-rara.
- [Cesare Cesariano 1521 — C](cesariano-1521.html): 390 IIIF images copied for study with institutional attribution.
- [Daniele Barbaro 1567 — B](barbaro-1567.html): 522 IIIF images served by e-rara.

Sulp., Iuc., Caes. and Barb. are abbreviations for **printed editions**, chosen so as not to collide with the critical sigla of manuscript witnesses (H, G, E, S…). Sulpizio and Cesariano images use local copies with source attribution and provenance, while the Giocondo and Barbaro viewers access the original services remotely.

**Discovery:** the site includes [sitemap.xml](sitemap.xml) and [robots.txt](robots.txt), with individual bibliographic records and scholarly search metadata.

## Teaching resources for ancient Roman history and architecture

The [Roman architecture and Vitruvius teaching guide](docencia-roma-antigua.html) offers seven seminar themes with book/chapter anchors, aligned Latin–Spanish/French/English reading links and links to notes. It is a non-accredited independent educational resource, not a certified syllabus.

## University libraries and subject librarians

**[Academic library dossier / ficha para bibliotecas universitarias](bibliotecas-universitarias.html)**

The site offers open-access, directly citable editorial versions and manuscript / early-print facsimile access. Its cataloguing dossier provides an independent project's scope, editorial limitations, provenance and preservation links, version-specific DOI references, plus [RIS](bibliotecas/vitruvius-biblioteca.ris), [BibTeX](bibliotecas/vitruvius-biblioteca.bib), and [JSON-LD](bibliotecas/vitruvius-biblioteca.jsonld) exports.

A library's independent evaluation, subject-guide inclusion, acquisition or cataloguing decision cannot be inferred from a DOI or a project link.

### Verified university subject-guide listing (2 November 2026)

The **University of Cambridge, Faculty of Classics Library** [lists Vitruvius Digital Library in its *Classics: Latin Lang & Lit* LibGuide under open-access databases](https://libguides.cam.ac.uk/c.php?g=363717&p=4973030). The listing was verified publicly on 2 November 2026. This is an external subject-guide reference, **not** a Cambridge endorsement, affiliation or peer review of the editorial texts.

### Ancient World Online (AWOL) coverage

Charles E. Jones posted [*VITRVVIVS DIGITAL LIBRARY*](https://ancientworldonline.blogspot.com/2026/11/) in **AWOL — The Ancient World Online**, on 1 November 2026. This specialist open-access-resource notice is independent coverage, not peer review.

## English — About the project

The Vitruvius Digital Library brings together a catalogue of manuscript witnesses, historical printed editions, translations, and resources for reading and searching *De architectura*. Its research tools support passage references (*loci*), terminology searches and comparison across the indexed editions.

The current searchable corpus includes three editions by Diego Kurilo (Latin–Spanish V514, Latin–French V554 and Latin–English V297). Historical facsimiles are identified with their holding institutions and source links. Catalogue inclusion must **not** be interpreted as a new manuscript collation, a verified transcription of every historical witness, or institutional endorsement.

**Editorial approach:** the editor describes his work as a bilingual reading edition with a **selective** critical apparatus. The Latin base text follows Fritz Krohn (1912), with Rose (1899) and other scholarship consulted as described in the editorial principles. Automated indexing and text alignment are research aids, not substitutes for manuscript verification or peer review.

**Current limitations (November 2026):**
- Exhaustive end-to-end browser testing of all search, PDF/IIIF and export workflows remains outstanding.
- The multilingual semantic-search embedding matrix and its evaluation are not completed; do not interpret its interface or experimental code as a validated semantic research system.
- Not every historical catalogue entry has a complete searchable transcription.
- Some bibliography records and critical-note-to-locus associations remain provisional.
- Specific bibliographic metadata, including the ISBN displayed on the Spanish and French editions, require checking against publication records.

Researchers are invited to test the library, report broken links and problematic readings, and suggest corrections. Please include the page URL, exact locus, edition and expected behaviour when reporting an issue.

**Research documentation:** [Editorial method](metodologia.html) · [Praefatio editoris](principios.html) · [Audit and outstanding work](auditoria.html) · [Critical notes and textual index](aparato-critico.html).

## Español — Presentación

Biblioteca digital académica independiente de acceso gratuito, dedicada a los manuscritos, ediciones históricas, traducciones y herramientas de investigación sobre *De architectura* de Vitruvio.

Su corpus indexado incluye tres ediciones de Diego A. Kurilo (V514, V554 y V297), con búsquedas por términos y *loci*. Los facsímiles históricos conservan la atribución de procedencia. La presencia de un documento en el catálogo **no certifica** una colación directa de manuscritos ni supone el aval de las instituciones depositarias.

El autor caracteriza sus ediciones como **ediciones bilingües de lectura con aparato crítico selectivo**, no como nuevas recensiones exhaustivas de toda la tradición manuscrita. Las alineaciones automáticas y los índices deben verificarse antes de utilizarse como prueba de variantes textuales.

**Pendientes conocidos:** pruebas integrales de los buscadores y visores; finalización y evaluación de la búsqueda semántica multilingüe; revisión de fichas bibliográficas y asociaciones de notas críticas; verificación de metadatos editoriales e ISBN de cada edición.

Se agradecen observaciones de latinistas, filólogos clásicos, historiadores de la arquitectura e investigadores en humanidades digitales. Para informar un problema, indicar URL, edición, locus, consulta y resultado esperado.

**Documentación:** [Método editorial](metodologia.html) · [Principios editoriales](principios.html) · [Auditoría](auditoria.html) · [Índice textual y notas](aparato-critico.html).

## Reference aliases and reproducible lookup

The canonical *De architectura* preface locus is written as `2.praef.1` (book II, preface, section 1). Search and direct-locus input also accept `2.pr.1`, `II.pref.1`, `prefacio I del libro II` and `prefacio del libro II, sección 1`. These forms resolve to the same indexed passage without rewriting the historical testimony or the editor's source wording.

An unqualified shorthand such as `libro 2 - 1` means **book II, chapter 1**, not the preface. In Vitruvia the search also offers an alternative link to preface II.1, so the two are not silently conflated. `prefacio I del libro` without a book number searches the first section of the prefaces across books; the software does not invent a missing book number.

Regression tests: `node tests/locus-aliases.mjs`. All automated associations remain navigational conveniences, not manuscript collation or independent validation of the textual readings.

## Deployment and rights

Hosted through GitHub Pages from the default branch, root directory; no build process or API keys required.

Diego Kurilo's original books are made available with the author's authorization. Historical source materials retain their institutional attribution; online access does not imply unrestricted relicensing or republication rights. Large source files may be served in parts, which the viewer reconstructs in the browser.
