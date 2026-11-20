#!/usr/bin/env python3
"""Promote six *already indexed* remote Latin originals to local searchable copies.
No new distinct ancient works and no R2 upload claimed. Runs via GitHub Actions.
"""
import json
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data/classics-corpus"
BRIDGE = DATA / "remote-latin-index-bridge-20261120.json"
REGISTRY = DATA / "search-registry.json"

def fetch_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Vitruvius-Corpus-Importer/1.0"})
    with urllib.request.urlopen(req, timeout=50) as response:
        raw = response.read()
    return json.loads(raw.decode("utf-8-sig"))

def main():
    evidence = json.loads(BRIDGE.read_text(encoding="utf-8"))
    reg = json.loads(REGISTRY.read_text(encoding="utf-8"))
    entries = reg["entries"]
    staged = []
    for item in evidence["items"]:
        wid = item["workId"]
        local = DATA / f"{wid}-la.json"
        if local.exists() or any(e.get("workId") == wid and e.get("language") == "la" for e in entries):
            print("SKIP already local:", wid)
            continue
        branch = item["branch"]
        path = item["textPath"]
        url = f"https://raw.githubusercontent.com/diegoalonsok-png/vitruvius-digital-library/{branch}/{path}"
        body = fetch_json(url)
        passages = body.get("passages")
        if not (body.get("workId") == wid and body.get("language") == "la"
                and body.get("sourceSha256") == item["sourceSha256"]
                and isinstance(passages, list) and len(passages) == item["passages"]
                and all(isinstance(p.get("locus"),str) and isinstance(p.get("text"),str) and p["text"].strip() for p in passages)):
            raise ValueError("Remote index failed checks: " + wid)
        # Exact passage-locus duplication is a serious integrity failure.
        if len({p["locus"] for p in passages}) != len(passages):
            raise ValueError("Repeated loci in " + wid)
        body["importProvenance"] = {
            "remoteBranch": branch,
            "remotePath": path,
            "remoteManifest": item["manifestPath"],
            "status": "copied from verified remote structured index (not freshly collated)",
        }
        staged.append((local, body))
        entries.append({
            "workId": wid, "author": body.get("author",""), "title":body.get("title",""),
            "language":"la", "format":"json-passages",
            "path": local.relative_to(ROOT).as_posix(),
            "reader":f"classics-text-reader.html?work={wid}&lang=la",
            "sourceDescription": body.get("attribution", "Remote indexed Latin text; provenance recorded")
        })
    # Write nothing until all remote fetches and structural checks have passed.
    for local, body in staged:
        local.write_text(json.dumps(body, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
        print("IMPORTED",body["workId"],len(body["passages"]),"passages")
    if staged:
        reg["entries"] = sorted(entries,key=lambda e:(e.get("workId",""),e.get("language","")))
        reg["count"] = len(reg["entries"])
        reg["works"] = len({e["workId"] for e in reg["entries"]})
        reg["updated"] = "2026-11-20"
        REGISTRY.write_text(json.dumps(reg,ensure_ascii=False,indent=2)+"\n", encoding="utf-8")
    print(json.dumps({"newLocalCopies":len(staged),"searchableTextVersions":reg["count"],
                      "distinctWorksInSearchRegistry":reg["works"]}))

if __name__ == "__main__":
    main()
