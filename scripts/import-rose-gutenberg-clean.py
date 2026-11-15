#!/usr/bin/env python3
"""Import Rose 1899's independent Gutenberg clean-text section without OCR.
Does not modify web pages, PDFs, old OCR, or Vitruvius translations.
"""
import hashlib, json, re, unicodedata, urllib.request
from collections import Counter
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
URL="https://www.gutenberg.org/files/51812/51812-0.txt"
NUMERALS=("PRIMUS","SECUNDUS","TERTIUS","QUARTUS","QUINTUS","SEXTUS","SEPTIMUS","OCTAVUS","NONUS","DECIMUS")

def words(s):
    s="".join(c for c in unicodedata.normalize("NFD",s.lower()) if not unicodedata.combining(c))
    return re.findall("[a-z]+",s.replace("j","i").replace("v","u"))
def overlap(a,b):
    ca,cb=Counter(words(a)),Counter(words(b))
    return round(200*sum((ca&cb).values())/(sum(ca.values())+sum(cb.values())),2)
def main():
    req=urllib.request.Request(URL,headers={"User-Agent":"VitruviusDigitalLibrary/1.0 (scholarly clean text import)"})
    with urllib.request.urlopen(req,timeout=80) as response: raw=response.read()
    if len(raw)<100000:raise ValueError("Source appears truncated")
    source=raw.decode("utf-8-sig")
    # The Gutenberg file contains the original page-and-apparatus layout first,
    # then the independent uninterrupted plain-text edition, followed by Faventinus.
    # NEVER ingest the first apparatus-bearing printing or the later Faventinus text.
    normalized=source.replace("\\r\\n","\\n")
    anchors=list(re.finditer(r"(?m)^VITRUVII DE ARCHITECTURA\\s*\\nLIBER PRIMUS\\.\\s*$",normalized))
    anchor=anchors[-1] if anchors else None
    if not anchor:raise ValueError("Plain-text Rose section start not found")
    vitruvius=normalized[anchor.start():]
    boundary=re.search(r"(?m)^M\\. CETI FAVENTINI\\s*$",vitruvius)
    if not boundary:raise ValueError("Faventinus boundary not found; refusing mixed corpus")
    source=vitruvius[:boundary.start()]
    pattern=re.compile(r"(?m)^LIBER\s+("+"|".join(NUMERALS)+r")\.$",re.I)
    matches=list(pattern.finditer(source))
    if len(matches)!=10 or [m.group(1).upper() for m in matches]!=list(NUMERALS):
        raise ValueError("Incomplete or unrecognized ten-book sequence")
    books=[]
    for i,m in enumerate(matches):
        body=source[m.end():matches[i+1].start() if i+1<10 else len(source)].strip()
        if len(words(body))<800:raise ValueError("Suspiciously short book "+str(i+1))
        books.append({"book":i+1,"heading":"LIBER "+NUMERALS[i]+".","latin":body,"word_count":len(words(body))})
    passages=json.loads((ROOT/"data/structured/recensio-es.json").read_text(encoding="utf-8"))["passages"]
    rows=[]
    for b in books:
        base="\n".join(p["latin"] for p in passages if p["book"]==b["book"])
        rows.append({"book":b["book"],"rose_words":b["word_count"],"v514_words":len(words(base)),
                     "normalized_multiset_word_overlap_percent":overlap(b["latin"],base),
                     "locus_alignment":"pending"})
    corpus={"schema":"vdl-rose-1899-clean-candidate-v1","edition":"Valentin Rose (1899)",
            "status":"transcription_candidate_not_folio_verified","source_url":URL,
            "source_sha256":hashlib.sha256(raw).hexdigest(),
            "method":"Gutenberg #51812 second, apparatus-free text; no new OCR; no editorial substitutions",
            "locus_alignment":"not_performed","books":books}
    output=ROOT/"data/text/rose-1899-gutenberg-clean-candidate.json"
    output.write_text(json.dumps(corpus,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    audit=ROOT/"data/index/cotejo-rose-1899-gutenberg-v514-candidate.json"
    audit.write_text(json.dumps({"schema":"rose-v514-book-overlap-v1","source_url":URL,
        "warning":"Word multiset overlap is a heuristic, not verified locus alignment or textual identity",
        "books":rows},ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("Imported",len(books),"books",sum(x["word_count"] for x in books),"words")
if __name__=="__main__":main()
