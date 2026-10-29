#!/usr/bin/env python3
"""Build page-aligned searchable indexes for Vitruvius Digital Library.
Run: python scripts/build_corpus.py --es path/to/V514.pdf --en path/to/V297.pdf
Produces data/text/recensio-es.json and data/text/theory-en.json.
Requires: pip install pymupdf
This script only builds local files; publish them with their source PDFs.
"""
import argparse, json, pathlib, sys
import fitz

TARGETS={"es":("recensio-es","V514"),"en":("theory-en","V297"),"fr":("recensio-fr","V554")}
def build(path,edition,version,outdir):
    doc=fitz.open(path)
    entries=[]
    for number,page in enumerate(doc,1):
        text=page.get_text("text",sort=True)
        entries.append({"page":number,"text":text})
    outdir.mkdir(parents=True,exist_ok=True)
    target=outdir/(edition+".json")
    target.write_text(json.dumps(entries,ensure_ascii=False,separators=(",",":")),encoding="utf-8")
    nonempty=sum(bool(e["text"].strip()) for e in entries)
    print(f"{version}: {len(entries)} PDF pages; {nonempty} pages with searchable text -> {target}")
    if not nonempty:
        raise RuntimeError(f"{version}: no extractable text; OCR or a transcribed edition required")
    return len(entries),nonempty
def main():
    ap=argparse.ArgumentParser()
    for lang in TARGETS: ap.add_argument("--"+lang,type=pathlib.Path)
    ap.add_argument("--output",type=pathlib.Path,default=pathlib.Path("data/text"))
    args=ap.parse_args()
    if not any(getattr(args,k) for k in TARGETS):
        ap.error("Specify at least one source PDF: --es, --fr or --en")
    for lang,(edition,version) in TARGETS.items():
        src=getattr(args,lang)
        if src:
            if not src.is_file(): ap.error(f"Not found: {src}")
            build(src,edition,version,args.output)
if __name__=="__main__": main()
