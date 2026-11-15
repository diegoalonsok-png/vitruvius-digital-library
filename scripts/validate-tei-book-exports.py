#!/usr/bin/env python3
"""Validate 30 real TEI exports against their source passages.

XML namespace, metadata, unique IDs, exact locus and exact Latin/translation
preservation are checked. This is not full TEI Relax NG validation, and it
does not certify the underlying editorial readings.
"""
import json
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
EXPORTS = ROOT / "reports" / "tei-export-validation"
NS = {"tei": "http://www.tei-c.org/ns/1.0"}
Q = "{http://www.tei-c.org/ns/1.0}"
XML_ID = "{http://www.w3.org/XML/1998/namespace}id"
XML_LANG = "{http://www.w3.org/XML/1998/namespace}lang"
EDITIONS = {"recensio-es": ("V514", "es"),
            "recensio-fr": ("V554", "fr"),
            "theory-en": ("V297", "en")}

def ensure(ok, message):
    if not ok:
        raise AssertionError(message)

def main():
    catalogue = json.loads((ROOT / "data/catalog.json").read_text(encoding="utf-8"))
    catalogue_by_id = {edition["id"]: edition for edition in catalogue["editions"]}
    seen_files = 0
    seen_passages = 0
    for edition, (version, language) in EDITIONS.items():
        source = json.loads((ROOT / "data/structured" / (edition + ".json")).read_text(encoding="utf-8"))
        meta = catalogue_by_id[edition]
        for book in range(1, 11):
            filename = EXPORTS / f"{edition}-liber-{book}.xml"
            root = ET.parse(filename).getroot()
            prefix = f"{edition} libro {book}"
            ensure(root.tag == Q + "TEI", prefix + ": wrong TEI namespace")
            ensure(root.get(XML_LANG) == "la", prefix + ": root language")
            ensure(root.findtext(".//tei:idno[@type='DOI']", namespaces=NS) == str(meta["doi"]), prefix + ": DOI")
            ensure(root.findtext(".//tei:idno[@type='ISBN']", namespaces=NS) == str(meta["isbn"]), prefix + ": ISBN")
            ensure(root.findtext(".//tei:idno[@type='edition']", namespaces=NS) == str(meta["version"]), prefix + ": edition")
            ensure(root.findtext(".//tei:idno[@type='source-sha256']", namespaces=NS) == source["source"]["sha256"], prefix + ": source fingerprint")
            divs = root.findall(".//tei:div[@type='book']", NS)
            ensure(len(divs) == 1 and divs[0].get("n") == str(book), prefix + ": book")
            actual = divs[0].findall("./tei:div[@type='section']", NS)
            expected = [p for p in source["passages"] if int(p["book"]) == book]
            ensure(len(actual) == len(expected), prefix + ": passage count")
            seen_ids = set()
            for passage, record in zip(actual, expected):
                locus = str(record["locus"])
                ensure(passage.get("n") == locus, prefix + ": locus mismatch " + locus)
                xml_id = passage.get(XML_ID)
                ensure(xml_id and xml_id not in seen_ids, prefix + ": duplicate/missing xml:id")
                seen_ids.add(xml_id)
                latin = passage.find("./tei:ab[@type='text']", NS)
                ensure(latin is not None and latin.get(XML_LANG) == "la", prefix + ": missing Latin")
                ensure((latin.text or "") == str(record.get("latin") or ""), prefix + ": Latin changed at " + locus)
                translation = passage.find("./tei:ab[@type='translation']", NS)
                if record.get("translation"):
                    ensure(translation is not None and translation.get(XML_LANG) == language,
                           prefix + ": missing/wrong translation at " + locus)
                    ensure((translation.text or "") == str(record["translation"]),
                           prefix + ": translation changed at " + locus)
                else:
                    ensure(translation is None, prefix + ": invented translation at " + locus)
            seen_files += 1
            seen_passages += len(actual)
    print(f"PASS: {seen_files} TEI XML exports parsed; {seen_passages} source passages preserved exactly.")
    print("NOTE: Full TEI P5 Relax NG validation and human philological review remain separate tasks.")

if __name__ == "__main__":
    main()
