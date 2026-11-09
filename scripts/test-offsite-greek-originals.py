#!/usr/bin/env python3
"""Prove that extraction keeps editorial Greek and isolates apparatus notes."""
import importlib.util
from pathlib import Path

path=Path(__file__).with_name("build-offsite-greek-originals.py")
spec=importlib.util.spec_from_file_location("remote_greek_builder",path)
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
sample = ("μὲν δὲ ἀρχαία Ἑλλάς ἡ χώρα ἐστίν. "*18).strip()
xml=(
 '<TEI xmlns="http://www.tei-c.org/ns/1.0"><teiHeader><fileDesc>'
 '<titleStmt><title>Μηχανικά</title><editor>Editor</editor></titleStmt>'
 '<publicationStmt><availability><licence target="https://creativecommons.org/licenses/by-sa/4.0/">CC</licence></availability></publicationStmt>'
 '<sourceDesc><bibl>Editor, critical Greek edition, Oxford, 1901.</bibl></sourceDesc>'
 '</fileDesc></teiHeader><text><body><div type="edition" xml:lang="grc" n="urn:cts:greekLit:tlg0086.tlg023.1st1K-grc1">'
 '<div type="textpart" subtype="book" n="1"><div type="textpart" subtype="chapter" n="2">'
 '<p>'+sample+'<note>ENGLISH NOTE MUST NOT BE INDEXED</note></p>'
 '<p>'+sample+'</p></div></div></div></body></text></TEI>'
).encode("utf-8")
source={"author":"Pseudo-Aristóteles","title":"Μηχανικά"}
x=module.convert("ps-aristotle-mechanica",xml,"https://raw.githubusercontent.com/example/edition.xml",source)
assert x["workId"]=="ps-aristotle-mechanica"
assert x["language"]=="grc"
assert x["license"].startswith("CC BY-SA")
assert len(x["passages"])==2
assert [p["locus"] for p in x["passages"]]==["1.2~p1","1.2~p2"]
assert all("ENGLISH NOTE" not in p["text"] for p in x["passages"])
assert all(p["editorialLocus"]=="1.2" for p in x["passages"])
assert all(len(p["text"])>600 for p in x["passages"])
# A normalized surface selects ONE editor's reading; it never concatenates variants.
choice = module.ET.fromstring('<choice xmlns="http://www.tei-c.org/ns/1.0"><sic>σφάλα</sic><corr>σῶμα</corr></choice>')
apparatus = module.ET.fromstring('<app xmlns="http://www.tei-c.org/ns/1.0"><lem>λόγος</lem><rdg>νόμος</rdg></app>')
assert module.surface(choice)=="σῶμα"
assert module.surface(apparatus)=="λόγος"
bloom = module.bloom_filter(x["passages"])
assert bloom["bits"]==262144 and bloom["tokens"]>=3
assert len(module.base64.b64decode(bloom["data"]))==32768
assert len(module.SOURCES)==14
assert any(work=="euclid-phaenomena" and path.endswith("tlg1799.tlg012.1st1K-grc1.xml") for work,repo,path in module.SOURCES)
try:
 module.convert("ps-aristotle-mechanica",xml.replace(b"creativecommons.org/licenses/by-sa/4.0/",b"invalid.example/"),"x",source)
 raise AssertionError("An unknown licence must reject ingestion")
except ValueError as e:
 assert "licence" in str(e).lower() or "cc by-sa" in str(e).lower()
assert len(module.MARKDOWN_SOURCES) == 3
normalized_source = (
 "---\n"
 "title: Constructions of War Machines and Catapults\n"
 "title_greek: Κατασκευαὶ πολεμικῶν ὀργάνων καὶ καταπαλτικῶν\n"
 "author: Biton Mechanicus\n"
 "eul_wid: lsg-aa\n"
 "lang: grc\n"
 'canonical: "https://eulogikon.org/works/biton-war-machines-catapults-lsg-aa"\n'
 'license: "https://creativecommons.org/publicdomain/mark/1.0/"\n'
 "---\n\n# Biton\n\n## Text\n"
 "## ΒΙΤΩΝΟΣ ΚΑΤΑΣΚΕΥΑΙ\n"
 + (sample * 3)
 + "\n### 1\n" + sample * 3
 + "\n*[crux: disputed editorial reading]*\n"
 + "\n### 2\n" + sample * 3
 + "\n### 3\n" + sample * 3
 + "\n## License and provenance\n"
 + "Eulogikon publishes public-domain Greek texts in cleaned, structured, readable form.\n"
).encode("utf-8")
md_url = module.MARKDOWN_BASE + "biton-war-machines-catapults-lsg-aa.grc.md"
md = module.convert_markdown(
 "biton-kataskeuai", normalized_source, md_url,
 {"author":"Bitón", "title":"Κατασκευαὶ πολεμικῶν ὀργάνων καὶ καταπαλτικῶν",
  "reading":{"url":"https://archive.org/details/poliorktikakaip00petegoog"}},
 "lsg-aa"
)
assert md["sourceType"]=="normalized-greek-reading"
assert md["sourceUrn"]==""
assert md["editorialStatus"].find("NO edición crítica")>=0
assert md["readingFacsimile"].startswith("https://archive.org/")
assert [p["locus"] for p in md["passages"]]==["proemium.source","1","2","3"]
assert md["sourceEditorialNotesExcluded"]==1
assert all("disputed editorial reading" not in p["text"] for p in md["passages"])
assert len(md["passages"])==4
try:
 module.convert_markdown("biton-kataskeuai",
  normalized_source.replace(b"publicdomain/mark/1.0/",b"licenses/by-sa/4.0/"),
  md_url, {"author":"Bitón", "title":"Κατασκευαὶ..."}, "lsg-aa")
 raise AssertionError("Non-matching license must reject ingestion")
except ValueError:
 pass
print("PASS: 14 critically identified Greek TEI plus 3 separately marked normalized public-domain readings; no fabricated codex loci.")

