#!/usr/bin/env python3
"""Recover TEI footnotes without modifying any imported corpus or translation.

Only byte-identical, SHA-256-verified sources are accepted. Notes move out of
the reading text only when their entire span is contained in an exact match
of an existing passage. Original imported text remains in the sidecar and in
the untouched corpus. Bibliographical references are not textual variants.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import hashlib
import json
from pathlib import Path
import re
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET

from mass_index_notes_compat import normalize_tei

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data/classics-corpus/reading-notes"
NS = {"t": "http://www.tei-c.org/ns/1.0"}


def plain(node):
    return " ".join(" ".join(node.itertext()).split()) if node is not None else ""


def extract(corpus, raw):
    observed = hashlib.sha256(raw).hexdigest()
    if observed != corpus.get("sourceSha256"):
        raise ValueError("Source SHA-256 differs; no notes published")
    root = ET.fromstring(normalize_tei(raw))
    body = root.find(".//t:body", NS)
    if body is None:
        raise ValueError("TEI body absent")
    words, annotations = [], []

    def walk(node, inside_note=False):
        tag = node.tag.rsplit("}", 1)[-1]
        # Preserve every textual token. Only explicit source markup is moved.
        is_note = not inside_note and tag in ("note", "bibl")
        start = len(words)
        words.extend((node.text or "").split())
        for child in node:
            walk(child, inside_note or is_note)
            words.extend((child.tail or "").split())
        if is_note and len(words) > start:
            is_ref = tag == "bibl" or node.find(".//t:bibl", NS) is not None
            kind = "reference" if is_ref else "editorial"
            if node.get("type", "").lower() in ("critical", "crit", "apparatus", "textual"):
                kind = "textual"
            annotations.append({"a": start, "b": len(words), "kind": kind,
                                "text": " ".join(words[start:]),
                                "number": node.get("n", ""),
                                "sourceTag": tag})

    walk(body)
    full = " ".join(words)
    offsets, offset = [], 0
    for word in words:
        offsets.append(offset)
        offset += len(word) + 1
    for note in annotations:
        note["a"], note["b"] = offsets[note["a"]], offsets[note["b"] - 1] + len(words[note["b"] - 1])
    annotations.sort(key=lambda n: n["a"])
    passages = {}
    for item in corpus["passages"]:
        original = item["text"]
        start = full.find(original)
        if start < 0 or full.find(original, start + 1) >= 0:
            continue  # Never guess an anchor in ambiguous or differently segmented text.
        end = start + len(original)
        overlaps = [n for n in annotations if n["b"] > start and n["a"] < end]
        if not overlaps or any(n["a"] < start or n["b"] > end for n in overlaps):
            continue  # A clipped note stays in the original imported passage.
        pieces, notes, cursor = [], [], 0
        for note in overlaps:
            a, b = note["a"] - start, note["b"] - start
            if original[a:b] != note["text"]:
                raise ValueError("Annotation span differs from imported passage")
            pieces.append(original[cursor:a])
            cursor = b
            notes.append({**{k: note[k] for k in ("kind", "text", "number", "sourceTag")}, "start": len(original[:a].encode("utf-16-le")) // 2, "end": len(original[:b].encode("utf-16-le")) // 2})
        pieces.append(original[cursor:])
        text = re.sub(r"\s+", " ", "".join(pieces)).strip()
        if not text:
            continue
        passages[item["locus"]] = {"sourceLength": len(original.encode("utf-16-le")) // 2, "sourceTextSha256": hashlib.sha256(original.encode()).hexdigest(), "notes": notes}
    monogr = root.find(".//t:sourceDesc//t:monogr", NS)
    header = root.find(".//t:titleStmt", NS)
    metadata = {}
    if header is not None:
        metadata["editor"] = "; ".join(plain(n) for n in header.findall("t:editor", NS))
    if monogr is not None:
        for key, path in [("title", "t:title"), ("date", "t:imprint/t:date"), ("volume", "t:biblScope[@unit='volume']")]:
            metadata[key] = plain(monogr.find(path, NS))
        metadata["publisher"] = "; ".join(plain(n) for n in monogr.findall("t:imprint/t:publisher", NS))
        metadata["place"] = "; ".join(plain(n) for n in monogr.findall("t:imprint/t:pubPlace", NS))
    return {"schema": "vdl-source-reading-notes-v2", "workId": corpus["workId"],
            "language": corpus["language"], "source": corpus["source"],
            "sourceSha256": observed, "metadata": metadata,
            "policy": "Notes transcribed from explicit TEI markup; no new collation or supplied readings. Imported text retained verbatim.",
            "passages": passages}


def write_verified_notes(corpus, raw):
    """Reuse bytes already fetched by the downloader before publication."""
    doc = extract(corpus, raw)
    OUT.mkdir(parents=True, exist_ok=True)
    name = corpus["workId"] + "-" + corpus["language"] + ".json"
    target = OUT / name
    target.write_text(json.dumps(doc, ensure_ascii=False, separators=(",", ":")) + "\n")
    manifest_path = OUT / "manifest.json"
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {"schema": "vdl-source-reading-notes-manifest-v1", "entries": [], "unavailable": []}
    entry = {"workId": corpus["workId"], "language": corpus["language"], "path": str(target.relative_to(ROOT)),
             "passagesWithNotes": len(doc["passages"]), "notes": sum(len(p["notes"]) for p in doc["passages"].values()), "sourceSha256": doc["sourceSha256"]}
    manifest["entries"] = [e for e in manifest["entries"] if (e["workId"], e["language"]) != (entry["workId"], entry["language"])] + [entry]
    manifest["entries"].sort(key=lambda e: (e["workId"], e["language"]))
    manifest["unavailable"] = [e for e in manifest.get("unavailable", []) if e.get("file") != name]
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    return entry


def build(path):
    corpus = json.loads(path.read_text())
    with urlopen(Request(corpus["source"], headers={"User-Agent": "Vitruvius-Reading-Notes/1.0"}), timeout=25) as response:
        raw = response.read(8_000_001)
    if len(raw) > 8_000_000:
        raise ValueError("Source too large")
    doc = extract(corpus, raw)
    target = OUT / path.name
    target.write_text(json.dumps(doc, ensure_ascii=False, separators=(",", ":")) + "\n")
    return {"workId": corpus["workId"], "language": corpus["language"],
            "path": str(target.relative_to(ROOT)), "passagesWithNotes": len(doc["passages"]),
            "notes": sum(len(p["notes"]) for p in doc["passages"].values()),
            "sourceSha256": doc["sourceSha256"]}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--work")
    args = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    eligible = []
    for path in sorted((ROOT / "data/classics-corpus").glob("*.json")):
        doc = json.loads(path.read_text())
        if not isinstance(doc, dict) or not doc.get("passages") or doc.get("language") not in ("grc", "la"):
            continue
        if args.work and doc.get("workId") != args.work:
            continue
        if not re.fullmatch(r"https://raw\.githubusercontent\.com/(?:PerseusDL/canonical-(?:latinLit|greekLit)|OpenGreekAndLatin/First1KGreek)/[^?#]+\.xml", str(doc.get("source", ""))):
            continue
        if re.fullmatch(r"[0-9a-f]{64}", str(doc.get("sourceSha256", ""))):
            eligible.append(path)
    entries, unavailable = [], []
    with ThreadPoolExecutor(max_workers=8) as pool:
        pending = {pool.submit(build, p): p for p in eligible}
        for future in as_completed(pending):
            path = pending[future]
            try:
                entry = future.result()
                entries.append(entry)
                print(path.stem, entry["notes"], flush=True)
            except Exception as exc:
                unavailable.append({"file": path.name, "reason": str(exc)})
    if args.work and (OUT / "manifest.json").exists():
        previous = json.loads((OUT / "manifest.json").read_text())
        entries += [e for e in previous.get("entries", []) if e["workId"] != args.work]
        unavailable += [e for e in previous.get("unavailable", []) if not e["file"].startswith(args.work + "-")]
    manifest = {"schema": "vdl-source-reading-notes-manifest-v1", "entries": sorted(entries, key=lambda e: (e["workId"], e["language"])),
                "unavailable": unavailable}
    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"editions": len(entries), "notes": sum(e["notes"] for e in entries), "unavailable": len(unavailable)}))


if __name__ == "__main__":
    main()
