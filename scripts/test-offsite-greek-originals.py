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
assert len(module.SOURCES)==13
try:
 module.convert("ps-aristotle-mechanica",xml.replace(b"creativecommons.org/licenses/by-sa/4.0/",b"invalid.example/"),"x",source)
 raise AssertionError("An unknown licence must reject ingestion")
except ValueError as e:
 assert "licence" in str(e).lower() or "cc by-sa" in str(e).lower()
print("PASS: Greek TEI edition, editorial loci, note isolation, licensing, and 13 candidates.")
