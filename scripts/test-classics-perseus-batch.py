#!/usr/bin/env python3
"""Pruebas offline del importador Perseus; no se consulta la red ni se escribe corpus."""
import json
import re
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import importlib.util
spec = importlib.util.spec_from_file_location("perseus_bulk", ROOT / "scripts/import-classics-perseus-batch.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
choose_edition = module.choose_edition

def read(path):
    return json.loads((ROOT / path).read_text(encoding="utf-8"))

def main():
    mapping = read("data/bibliotheca-perseus.json")["links"]
    catalogue = read("data/bibliotheca-graeca-latina-I-bce-I-ce.json")["works"]
    registry = read("data/classics-corpus/search-registry.json")["entries"]
    indexed = {(e["workId"], e["language"]) for e in registry}
    ids = {w["id"] for w in catalogue}
    assert len(ids) == len(catalogue)
    assert len(mapping) >= 150
    assert all(w in ids for w in mapping), "CTS points to unknown catalogue work"
    single = [w for w in catalogue if len(mapping.get(w["id"], [])) == 1 and
              w.get("language") in ("la", "grc") and
              (w["id"], w["language"]) not in indexed and
              re.fullmatch(r"(?:tlg|phi)\d+\.(?:tlg|phi|abo)\w+",
                           mapping[w["id"]][0].get("obra", ""))]
    # TEI mixta: un poema citado no puede reemplazar 20 párrafos de prosa.
    prose = "Cicero disputat de ratione dicendi atque de arte oratoria. " * 36
    mixed = ('<TEI xmlns="http://www.tei-c.org/ns/1.0"><teiHeader>'
             '<fileDesc><titleStmt><title>De oratore</title><author>Cicero</author>'
             '</titleStmt></fileDesc></teiHeader><text xml:lang="lat"><body>'
             '<div n="1"><p>' + prose + '<l n="1">versus insertus</l>'
             '</p></div></body></text></TEI>')
    title, author, language, passages = module.extract_tei_safely(mixed.encode(), "De oratore")
    assert title == "De oratore" and author == "Cicero"
    assert len(passages) >= 1
    assert sum(len(p["original"]) for p in passages) > 1500, "Prose was silently discarded"
    candidates = [
       "data/phi0474/phi037/phi0474.phi037.perseus-lat1.xml",
       "data/phi0474/phi037/phi0474.phi037.perseus-lat2.xml",
       "data/phi0474/phi037/phi0474.phi037.perseus-eng1.xml",
    ]
    assert choose_edition(candidates, "la").endswith("perseus-lat2.xml")
    assert choose_edition(candidates, "grc") is None
    result = subprocess.run(
        [sys.executable, "scripts/import-classics-perseus-batch.py", "--plan"],
        cwd=ROOT, capture_output=True, text=True, check=True,
    )
    plan = json.loads(result.stdout)
    assert plan["eligibleSingleCTS"] == len(single)
    assert plan["indexedVersions"] == len(registry)
    assert plan["catalogued"] == len(catalogue)
    print("PASS: Perseus candidate inventory", plan["eligibleSingleCTS"],
          "single-CTS works pending source verification; zero UI modifications.")

if __name__ == "__main__":
    main()
