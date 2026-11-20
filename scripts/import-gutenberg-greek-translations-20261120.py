#!/usr/bin/env python3
"""Import three documented human translations as searchable, UNALIGNED English passages.
Do not infer Greek-English parallel loci or update the number of distinct works.
Usage: python3 scripts/import-gutenberg-greek-translations-20261120.py
"""
import hashlib
import json
import re
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data/classics-corpus"
SOURCES = [
    ("strabo", "Estrabón", "Γεωγραφικά", "Hans Claude Hamilton; William Falconer", [44884, 44885, 44886]),
    ("josephus-antiquities", "Flavio Josefo", "Ἰουδαϊκὴ ἀρχαιολογία", "William Whiston", [2848]),
    ("josephus-war", "Flavio Josefo", "Περὶ τοῦ Ἰουδαϊκοῦ πολέμου", "William Whiston", [2850]),
]

def fetch(gid):
    urls = [
        f"https://www.gutenberg.org/ebooks/{gid}.txt.utf-8",
        f"https://www.gutenberg.org/cache/epub/{gid}/pg{gid}.txt",
        f"https://www.gutenberg.org/files/{gid}/{gid}-0.txt",
        f"https://www.gutenberg.org/files/{gid}/{gid}.txt",
    ]
    last = None
    for url in urls:
        try:
            request = urllib.request.Request(url, headers={"User-Agent": "VitruviusAcademicCorpus/1.0 (Gutenberg text source attribution)"})
            with urllib.request.urlopen(request, timeout=45) as response:
                raw = response.read()
            decoded = raw.decode("utf-8-sig")
            if len(decoded) < 10000 or "PROJECT GUTENBERG" not in decoded.upper():
                raise ValueError("Gutenberg text unexpectedly short or without source header")
            return url, raw, decoded
        except Exception as exc:
            last = exc
    raise RuntimeError(f"Could not download Gutenberg ebook {gid}: {last}")

def text_body(text):
    start = re.search(r"(?im)^\s*\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK.*$", text)
    end = re.search(r"(?im)^\s*\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK.*$", text)
    if start and end and start.end() < end.start():
        text = text[start.end():end.start()]
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"(?m)^[ \t]*\[Illustration[^\n]*$", "", text)
    return text.strip()

def passage_units(text, volume):
    paragraphs = re.split(r"\n\s*\n", text)
    units, buffer = [], []
    for p in paragraphs:
        p = re.sub(r"\s+", " ", p).strip()
        if not p or len(p) < 35:
            continue
        # Headings and Gutenberg editorial notes remain in the source sequence;
        # segment numbers are NOT canonical ancient loci.
        if len(" ".join(buffer)) > 1900:
            units.append(" ".join(buffer))
            buffer = []
        buffer.append(p)
    if buffer:
        units.append(" ".join(buffer))
    return [{"locus": f"en-volume-{volume}-segment-{i:05d}", "text": t,
             "locusKind": "secuencia de la traducción inglesa; NO alineada con el original griego"}
            for i, t in enumerate(units, 1)]

def main():
    registry_path = DATA / "search-registry.json"
    registry = json.loads(registry_path.read_text(encoding="utf-8"))
    entries = registry["entries"]
    generated = []
    for wid, author, title, translator, gids in SOURCES:
        target = DATA / f"{wid}-en.json"
        if target.exists() or any(e.get("workId") == wid and e.get("language") == "en" for e in entries):
            print(f"SKIP existing English edition: {wid}")
            continue
        raw_sources, passages = [], []
        for volume, gid in enumerate(gids, 1):
            url, raw, decoded = fetch(gid)
            raw_sources.append({"ebookId": gid, "url": url, "sha256": hashlib.sha256(raw).hexdigest(),
                                "bytes": len(raw)})
            passages.extend(passage_units(text_body(decoded), volume))
        if not passages or sum(len(p["text"]) for p in passages) < 30000:
            raise ValueError(f"Insufficient full text: {wid}")
        payload = {
            "workId": wid, "language": "en", "title": title, "originalLanguage": "grc",
            "translator": translator, "sourceType": "historical-human-english-project-gutenberg",
            "source": [f"https://www.gutenberg.org/ebooks/{g}" for g in gids],
            "sourceFiles": raw_sources,
            "attribution": f"{author}. {title}. English translation by {translator}. Project Gutenberg.",
            "license": "Historical translation; confirm local rights for redistribution; retain Gutenberg attribution",
            "editorialStatus": "Historical English translation, segmented for search; no independent philological collation",
            "alignmentStatus": "unaligned",
            "alignment": "Segments are ingestion-order locators, not canonical Greek loci.",
            "coverage": {"passages": len(passages), "chars": sum(len(p["text"]) for p in passages),
                         "unitType": "English sequential segments"},
            "passages": passages,
        }
        target.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        entries.append({"workId": wid, "author": author, "title": title, "language": "en",
                        "format": "json-passages", "path": target.relative_to(ROOT).as_posix(),
                        "reader": f"classics-text-reader.html?work={wid}&lang=en",
                        "sourceDescription": f"Gutenberg; historical human translation by {translator}; unaligned English segments"})
        generated.append(wid)
        print(f"INDEXED {wid}: {len(passages)} English passages")
    if generated:
        registry["entries"] = sorted(entries, key=lambda e: (e.get("workId", ""), e.get("language", "")))
        registry["count"] = len(registry["entries"])
        registry["works"] = len({e["workId"] for e in registry["entries"]})
        registry["updated"] = "2026-11-20"
        registry_path.write_text(json.dumps(registry, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"addedEnglishVersions": generated, "distinctWorks": registry["works"],
                      "searchableTextVersions": registry["count"]}, ensure_ascii=False))

if __name__ == "__main__":
    main()
