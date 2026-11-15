#!/usr/bin/env python3
"""Align independent Rose 1899 Gutenberg text to V514 loci; NO OCR and no textual substitution.

Every emitted Rose passage is an excerpt of the source transcription, never V514.
Low-confidence loci are left pending. Source provenance and normalized term index
are included; no paleographic verification or critical equivalence is asserted.
"""
import json, re, unicodedata, hashlib
from collections import Counter, defaultdict
from pathlib import Path
from difflib import SequenceMatcher

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/"data/text/rose-1899-gutenberg-clean-candidate.json"
BASE=ROOT/"data/structured/recensio-es.json"
TARGET=ROOT/"data/text/rose-1899-loci-candidate.json"
TERMS=ROOT/"data/index/rose-1899-semantic-candidate.json"
AUDIT=ROOT/"data/index/rose-1899-loci-alignment-audit.json"
WORD=re.compile(r"[^\W\d_]+", re.UNICODE)

def norm(word):
    s="".join(ch for ch in unicodedata.normalize("NFD",word.lower()) if not unicodedata.combining(ch))
    return s.replace("j","i").replace("v","u")

def tokenize(text):
    return [(norm(m.group()), m.start(), m.end()) for m in WORD.finditer(text)]

def dice(a,b):
    aa=Counter(a); bb=Counter(b); den=sum(aa.values())+sum(bb.values())
    return 2*sum((aa & bb).values())/den if den else 0

def align_book(book, passages):
    text=book["latin"]
    rose=tokenize(text)
    tokens=[w[0] for w in rose]
    index=defaultdict(list)
    for i in range(len(tokens)-4):
        index[tuple(tokens[i:i+5])].append(i)
    candidates=[]
    base_lens=[len(tokenize(p["latin"])) for p in passages]
    total=sum(base_lens) or 1
    accumulated=0
    for p,n in zip(passages,base_lens):
        base=[x[0] for x in tokenize(p["latin"])]
        approx=int(len(tokens)*accumulated/total)
        accumulated+=n
        votes=Counter()
        for offset in range(min(19,max(0,len(base)-4))):
            phrase=tuple(base[offset:offset+5])
            for pos in index.get(phrase,[])[:100]:
                start=pos-offset
                if 0<=start<len(tokens):
                    votes[start]+=1
        ranked=sorted(votes,key=lambda x:(-votes[x],abs(x-approx)))
        best=ranked[0] if ranked else None
        # Reject unanchored or weakly anchored loci rather than invent Rose text.
        if best is None or votes[best]<2:
            best=None
        candidates.append({"locus":p["locus"],"start":best,"votes":votes[best] if best is not None else 0,"base":base})
    # Enforce source order: out-of-order anchors are explicitly unresolved.
    last=-1
    for c in candidates:
        if c["start"] is not None:
            if c["start"]<=last:c["start"]=None
            else:last=c["start"]
    found=[]; review=[]
    for i,c in enumerate(candidates):
        nxt=candidates[i+1]["start"] if i+1<len(candidates) else len(tokens)
        if c["start"] is None or nxt is None or nxt<=c["start"]:
            review.append({"locus":c["locus"],"status":"pending_unanchored_or_adjacent_locus","anchor_votes":c["votes"]})
            continue
        source_start=rose[c["start"]][1]
        source_end=rose[nxt][1] if nxt<len(rose) else len(text)
        raw=text[source_start:source_end].strip()
        extracted=[w[0] for w in tokenize(raw)]
        similarity=dice(extracted,c["base"])
        ratio=len(extracted)/max(1,len(c["base"]))
        if not (.65<=ratio<=1.55 and similarity>=.80):
            review.append({"locus":c["locus"],"status":"pending_low_textual_alignment",
                           "word_overlap":round(100*similarity,2),"length_ratio":round(ratio,3)})
            continue
        found.append({"locus":c["locus"],"latin":raw,"source_book":book["book"],
                      "source_start_char":source_start,"source_end_char":source_end,
                      "similarity_v514_token_multiset_percent":round(similarity*100,2),
                      "status":"candidate_not_folio_verified","anchor_votes":c["votes"]})
    return found,review

def main():
    source=json.loads(SOURCE.read_text(encoding="utf-8"))
    if source.get("schema")!="vdl-rose-1899-clean-candidate-v1" or len(source.get("books",[]))!=10:
        raise ValueError("Rose independent transcription missing or incomplete")
    base=json.loads(BASE.read_text(encoding="utf-8"))["passages"]
    passages=[];pending=[]
    for book in source["books"]:
        rows=[p for p in base if int(p["book"])==int(book["book"]) and p.get("latin")]
        found,review=align_book(book,rows)
        passages.extend(found);pending.extend(review)
    known={p["locus"] for p in passages}
    expected={p["locus"] for p in base}
    assert known<=expected
    if len(passages)<350:
        raise ValueError("Rose alignment insufficient: "+str(len(passages))+" loci; refusing publication")
    corpus={"schema":"vdl-rose-1899-loci-candidate-v1","edition":"Valentin Rose, Teubner 1899",
      "source_url":source["source_url"],"source_sha256":source["source_sha256"],
      "status":"independent_transcription_candidate_not_folio_verified",
      "method":"Five-token anchors and monotone locus segmentation; only Rose source substrings, no OCR or V514 fill",
      "counts":{"indexed_loci":len(passages),"v514_reference_loci":len(expected),
                "pending_loci":len(expected-known)},
      "passages":passages}
    inverted=defaultdict(dict)
    for p in passages:
        counts=Counter(norm(m.group()) for m in WORD.finditer(p["latin"]))
        for term,count in counts.items():
            if len(term)>1: inverted[term][p["locus"]]=count
    semantic={"schema":"vdl-rose-1899-semantic-candidate-v1",
      "source_sha256":source["source_sha256"],"normalized":"casefold, accents, i/j, u/v",
      "terms":{w:v for w,v in sorted(inverted.items())}}
    audit={"schema":"rose-1899-loci-alignment-audit-v1",
      "source_sha256":source["source_sha256"],"indexed_loci":len(passages),
      "pending_loci":pending,
      "limitations":"Token overlap does not certify critical readings, literal identity, or folio alignment"}
    for path,obj in [(TARGET,corpus),(TERMS,semantic),(AUDIT,audit)]:
        path.parent.mkdir(parents=True,exist_ok=True)
        path.write_text(json.dumps(obj,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf-8")
    print("Rose 1899 non-OCR candidate loci:",len(passages),"pending:",len(expected-known),
          "indexed normalized terms:",len(inverted))
if __name__=="__main__":main()
