#!/usr/bin/env python3
"""Independent second-pass Rose audit: clean digital transcription vs historical OCR.

Never silently replace words in Rose, never count OCR disagreements as critical
variants. Produces a machine-readable review queue by locus.
"""
import json,re,unicodedata
from collections import Counter
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
DIGITAL=ROOT/"data/text/rose-1899-loci-candidate.json"
OCR=ROOT/"data/collation-loci.json"
OUTPUT=ROOT/"data/index/rose-1899-dual-source-review.json"

def tokens(s):
    s="".join(ch for ch in unicodedata.normalize("NFD",s.casefold()) if not unicodedata.combining(ch))
    return re.findall("[a-z]+",s.replace("j","i").replace("v","u"))

def overlap(a,b):
    left,right=Counter(tokens(a)),Counter(tokens(b))
    total=sum(left.values())+sum(right.values())
    return round(200*sum((left&right).values())/total,2) if total else 0

def main():
    corpus=json.loads(DIGITAL.read_text(encoding="utf-8"))
    ocr=json.loads(OCR.read_text(encoding="utf-8"))
    if corpus.get("schema")!="vdl-rose-1899-loci-candidate-v1":
        raise ValueError("Missing independent Rose locus transcription")
    rows=[]
    for p in corpus["passages"]:
        extracted=ocr.get("loci",{}).get(p["locus"],{}).get("rose-1899",{})
        raw=extracted.get("text","")
        score=overlap(p["latin"],raw) if raw else None
        rows.append({"locus":p["locus"],"digitized_rose_available":True,"historical_ocr_available":bool(raw),
                     "normalized_multiset_agreement_percent":score,
                     "review":"compare_folio" if score is None or score<95 else "dual_source_agreement_candidate",
                     "ocr_page":extracted.get("page"),
                     "source_char_range":[p["source_start_char"],p["source_end_char"]]})
    report={"schema":"rose-1899-dual-source-review-v1",
            "source":"Gutenberg 51812 independent transcription versus historical OCR from site, same historical edition",
            "warning":"Two sources can share editorial errors. Agreement is not independent witness confirmation or critical collation. No original text is rewritten.",
            "compared_loci":len(rows),"suspect_loci":sum(r["review"]=="compare_folio" for r in rows),
            "records":rows}
    OUTPUT.parent.mkdir(parents=True,exist_ok=True)
    OUTPUT.write_text(json.dumps(report,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf-8")
    print("Rose dual-source review:",report["compared_loci"],"loci; requiring folio review:",report["suspect_loci"])
if __name__=="__main__":main()
