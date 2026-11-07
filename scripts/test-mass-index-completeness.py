#!/usr/bin/env python3
"""Regresión offline: no eliminar prosa antigua al indexar una TEI con versos."""
from __future__ import annotations
import hashlib
import importlib.util
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
spec = importlib.util.spec_from_file_location("mass_index", ROOT / "scripts/mass-index-classics.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

def main():
    text = "In foro Romano artibus sapientiae philosophi et oratores disputabant. " * 75
    raw = ('<TEI xmlns="http://www.tei-c.org/ns/1.0"><teiHeader><fileDesc><titleStmt>'
           '<title>De oratore</title><author>Cicero</author></titleStmt></fileDesc></teiHeader>'
           '<text xml:lang="lat"><body><div n="1"><p>' + text +
           '<l n="1">versus brevis interpositus</l></p></div></body></text></TEI>').encode()
    digest = hashlib.sha256(raw).hexdigest()
    title, author, lang, passages = module.extract_complete_tei(raw, "De oratore")
    indexed = " ".join(p["original"] for p in passages)
    assert title == "De oratore" and author == "Cicero"
    assert len(indexed) > 3000, "Se perdió prosa por versos incrustados"
    assert "versus brevis interpositus" in indexed
    assert hashlib.sha256(raw).hexdigest() == digest, "El XML original fue alterado"
    poetry = ('<TEI xmlns="http://www.tei-c.org/ns/1.0"><teiHeader><fileDesc><titleStmt>'
              '<title>Carmina</title><author>Poeta</author></titleStmt></fileDesc></teiHeader>'
              '<text xml:lang="lat"><body><div n="1">'
              + ''.join('<l n="%d">Ars longa vita brevis versus antiquus.</l>' % i
                        for i in range(1, 23))
              + '</div></body></text></TEI>').encode()
    _, _, _, verse_passages = module.extract_complete_tei(poetry, "Carmina")
    assert verse_passages and any("Ars longa" in p["original"] for p in verse_passages)
    print("PASS: prosa mixta íntegra, versos preservados, XML sin modificación")

if __name__ == "__main__":
    main()
