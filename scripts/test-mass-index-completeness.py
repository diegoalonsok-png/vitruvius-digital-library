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
    # Perseus P4, Catón: external DTD and HTML named entities need temporary
    # normalization; source bytes must stay unchanged for sourceSha256.
    legacy = ('<!DOCTYPE TEI.2 PUBLIC "-//TEI P4//EN" "http://example.invalid/tei.dtd" ['
              '<!ENTITY % TEI.XML "INCLUDE">%TEI.XML;]>'
              '<TEI.2><teiHeader><fileDesc><titleStmt><title>De agri cultura</title>'
              '<author>Cato</author></titleStmt></fileDesc></teiHeader>'
              '<text xml:lang="lat"><body><div1 type="chapter" n="1"><p>'
              + ('Agricola terram colit &dagger; vinum ex &ouml;le conficit. ' * 50)
              + '</p></div1></body></text></TEI.2>').encode("utf-8")
    old_sha = hashlib.sha256(legacy).hexdigest()
    normalized = module.normalize_legacy_perseus_tei(legacy)
    assert b'<!DOCTYPE' not in normalized and b'<TEI xmlns=' in normalized
    title, author, lang, passages = module.extract_complete_tei(legacy, 'De agri cultura')
    assert title == 'De agri cultura' and author == 'Cato' and lang == 'lat'
    assert any('†' in p['original'] and 'ö' in p['original'] for p in passages)
    assert all(p['locus'].startswith('1.') for p in passages)
    assert hashlib.sha256(legacy).hexdigest() == old_sha, 'TEI original alterada'
    try:
        module.normalize_legacy_perseus_tei(legacy.replace(b'&dagger;', b'&entidadInventada;'))
        raise AssertionError('Entidad no reconocida aceptada')
    except ValueError as ex:
        assert 'desconocida' in str(ex)

    # XML con sangrías enormes: no confundir espacios de la TEI con texto omitido.
    # Patrón observado en Platón, Fedón (prosa con versos citados).
    spaced = ('<TEI xmlns="http://www.tei-c.org/ns/1.0">'
              '<teiHeader><fileDesc><titleStmt><title>Phaedo</title>'
              '<author>Plato</author></titleStmt></fileDesc></teiHeader>'
              '<text xml:lang="grc"><body><div n="57"><p>'
              + ('      \\n             ' * 450)
              + '<said>Ο λόγος περὶ ψυχῆς καὶ ἀληθείας λέγεται. ' * 35
              + '<l n="1">λόγος ἀρχαῖος</l></said></p></div></body></text></TEI>').encode("utf-8")
    title, author, lang, passages = module.extract_complete_tei(spaced, "Phaedo")
    assert title == "Phaedo" and author == "Plato" and lang == "grc"
    assert sum(len(p["original"]) for p in passages) > 500
    assert any("λόγος" in p["original"] for p in passages)

    print("PASS: prosa mixta íntegra, versos preservados, XML P4 y P5 sin modificación")

if __name__ == "__main__":
    main()
