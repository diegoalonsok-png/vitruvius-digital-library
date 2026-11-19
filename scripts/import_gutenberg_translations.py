#!/usr/bin/env python3
"""Import public-domain historical English translations, without claiming Greek alignment."""
import hashlib
import json
import re
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CORPUS = ROOT / "data/classics-corpus"
REGISTRY = CORPUS / "search-registry.json"
BOOKS = (
    ("aristophanes-acharnenses", "Ἀχαρνῆς · The Acharnians", 3012),
    ("aristophanes-pax", "Εἰρήνη · Peace", 2571),
    # Gutenberg 7700 is Jack Lindsay (d. 1990); do not redistribute without clearance.
    # Gutenberg 7998 requires translator/rights verification before redistribution.
)
START = re.compile(r"\*\*\*\s*START OF (?:THE |THIS )?PROJECT GUTENBERG EBOOK[^\n]*", re.I)
END = re.compile(r"\*\*\*\s*END OF (?:THE |THIS )?PROJECT GUTENBERG EBOOK[^\n]*", re.I)

def get_book(number):
    url = f"https://www.gutenberg.org/cache/epub/{number}/pg{number}.txt"
    request = urllib.request.Request(url, headers={"User-Agent": "VitruviusBibliothecaBot/1.0"})
    with urllib.request.urlopen(request, timeout=45) as response:
        raw = response.read(4500001)
    if not 12000 < len(raw) <= 4500000:
        raise ValueError(f"Gutenberg #{number}: invalid download size")
    text = raw.decode("utf-8-sig")
    a, b = START.search(text), END.search(text)
    if not a or not b or a.end() >= b.start():
        raise ValueError(f"Gutenberg #{number}: cannot verify complete text markers")
    return text[a.end():b.start()], url, hashlib.sha256(raw).hexdigest()

def segment(body):
    blocks = [re.sub(r"\s+", " ", p).strip()
              for p in re.split(r"\n\s*\n", body.replace("\r\n", "\n").replace("\r", "\n"))]
    groups, current = [], []
    for block in filter(None, blocks):
        if current and sum(map(len, current)) + len(block) > 1200:
            groups.append(" ".join(current))
            current = []
        if len(block) > 1800:
            if current:
                groups.append(" ".join(current))
                current = []
            groups.extend(block[i:i + 1100] for i in range(0, len(block), 1100))
        else:
            current.append(block)
    if current:
        groups.append(" ".join(current))
    if len(groups) < 10 or sum(map(len, groups)) < 10000:
        raise ValueError("Downloaded translation is unexpectedly short")
    return [{"locus": f"translation.segment-{i:04d}", "text": paragraph,
             "locusKind": "Gutenberg editorial segment; NOT aligned to Greek CTS"}
            for i, paragraph in enumerate(groups, 1)]

def main():
    registry = json.loads(REGISTRY.read_text(encoding="utf-8"))
    existing = {(e["workId"], e["language"]) for e in registry["entries"]}
    planned = []
    for work_id, title, number in BOOKS:
        if (work_id, "en") in existing:
            print(f"SKIP {work_id}: already registered")
            continue
        if (work_id, "grc") not in existing:
            raise ValueError(f"Original Greek not registered: {work_id}")
        target = CORPUS / f"{work_id}-en.json"
        if target.exists():
            raise ValueError(f"Existing unregistered translation needs reconciliation: {target}")
        body, url, digest = get_book(number)
        passages = segment(body)
        record = {
            "workId": work_id, "language": "en", "title": title,
            "sourceType": "historical-gutenberg-translation",
            "editorialStatus": "Historical translation segmented for searching; not aligned to Greek loci",
            "source": url, "sourceSha256": digest,
            "attribution": f"Aristophanes · {title} · Project Gutenberg #{number}",
            "license": "Gutenberg public domain in USA; verify applicable local laws and trademark terms",
            "alignment": "No Greek/English locus alignment",
            "passages": passages,
        }
        entry = {
            "workId": work_id, "author": "Aristófanes", "title": title,
            "language": "en", "format": "json-passages",
            "path": f"data/classics-corpus/{work_id}-en.json",
            "reader": f"classics-text-reader.html?work={work_id}&lang=en",
            "sourceDescription": f"English historical translation, Gutenberg #{number}; no Greek locus alignment",
        }
        planned.append((target, record, entry))
    # Nothing is written before every source has downloaded and passed validation.
    for target, record, entry in planned:
        target.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        registry["entries"].append(entry)
        print(f"IMPORTED {target.name}: {len(record['passages'])} searchable segments")
    if planned:
        registry["entries"].sort(key=lambda e: (e["workId"], e["language"], e.get("format", "")))
        registry["count"] = len(registry["entries"])
        registry["works"] = len({e["workId"] for e in registry["entries"]})
        registry["updated"] = "2026-11-19"
        REGISTRY.write_text(json.dumps(registry, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Completed with {len(planned)} new translations")

if __name__ == "__main__":
    main()
