#!/usr/bin/env python3
"""Install the shared language loader across every authored HTML page.

Idempotent and conservative: never rewrite a text, citation, original-language
page or PDF. The audit describes the entire *repository*, not a claimed browser
runtime result.
"""
from __future__ import annotations
import json
import re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
INCLUDE={".html"}
EXCLUDE_DIRS={".git","node_modules","vendor",".venv","__pycache__","dist","build","test-results","coverage"}
SOURCE_PREFIXES=("corpus/",)
LANGUAGE_RE=re.compile(r"<html\b[^>]*\blang\s*=\s*[\"'](la|grc|el|he|arc)[\"']",re.I)
SCRIPT_RE=re.compile(r'<script\b[^>]*\bsrc\s*=\s*[\"\'][^\"\']*(?:ui-idioma|site-language-coverage)\.js(?:\?[^\'\"]*)?[\"\']',re.I)
HEAD_END=re.compile(r"</head\s*>",re.I)
BODY_END=re.compile(r"</body\s*>",re.I)
VERSION="20261117-sitewide-370-v6"

def scan_and_patch(path:Path):
    rel=path.relative_to(ROOT).as_posix()
    raw=path.read_text(encoding="utf-8")
    if not ("<html" in raw.lower() or "<!doctype html" in raw.lower()):
        return "skipped-fragment"
    if rel.startswith(SOURCE_PREFIXES) or LANGUAGE_RE.search(raw):
        # Ancient and historical sources retain original language and typography.
        return "protected-source"
    if SCRIPT_RE.search(raw):
        return "already-linked"
    if path.name.startswith("_"):
        return "skipped-template"
    # Relative URLs for all depths, including readers under subdirectories.
    prefix="../"*len(path.relative_to(ROOT).parts[:-1])
    marker=f'<script defer src="{prefix}assets/ui-idioma.js?v={VERSION}" data-sitewide-i18n="1"></script>'
    if HEAD_END.search(raw):
        updated=HEAD_END.sub(lambda m:marker+"\n"+m.group(0),raw,count=1)
    elif BODY_END.search(raw):
        updated=BODY_END.sub(lambda m:marker+"\n"+m.group(0),raw,count=1)
    else:
        return "missing-insertion-point"
    if updated==raw:
        return "not-changed"
    path.write_text(updated,encoding="utf-8")
    return "linked"

def main():
    inventory=[]
    for path in sorted(ROOT.rglob("*.html")):
        if any(part in EXCLUDE_DIRS for part in path.relative_to(ROOT).parts):
            continue
        try:
            status=scan_and_patch(path)
        except UnicodeError:
            status="non-utf8"
        inventory.append({"path":path.relative_to(ROOT).as_posix(),"status":status})
    statuses={key:sum(r["status"]==key for r in inventory) for key in sorted({r["status"] for r in inventory})}
    uncovered=[x for x in inventory if x["status"] not in ("linked","already-linked","protected-source")]
    summary={
      "schema":"vitruvius-sitewide-i18n-coverage-v1",
      "purpose":"Static linkage audit, not proof of translated prose or browser navigation",
      "htmlFiles":len(inventory),
      "statuses":statuses,
      "uncovered":uncovered,
      "protected":sum(x["status"]=="protected-source" for x in inventory),
      "runtimeTranslationVerified":False,
    }
    out=ROOT/"data/audits/sitewide-i18n-linkage.json"
    out.parent.mkdir(parents=True,exist_ok=True)
    out.write_text(json.dumps(summary,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({k:v for k,v in summary.items() if k!="uncovered"},ensure_ascii=False))
    if uncovered:
        print("Uncovered HTML:",*[r["path"]+": "+r["status"] for r in uncovered[:30]],sep="\n")
    return 0 if not any(r["status"] in ("missing-insertion-point","non-utf8") for r in uncovered) else 1

if __name__=="__main__":
    raise SystemExit(main())
