#!/usr/bin/env python3
"""Índices livianos para tres diccionarios integrados de Lexicon.

No descarga, inventa ni modifica artículos de diccionarios. Reutiliza glosas
BREVES ya alojadas y las atribuye a su fuente, sin certificar desambiguación
automática de lemas. Preserva grafías griegas y hebreas completas.
"""
from __future__ import annotations
import json
from pathlib import Path
import re
import unicodedata

ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/"data/lexicon"
GLOSS=ROOT/"data/classics-lexicon"

def load(path):
    return json.loads(path.read_text(encoding="utf-8"))

def write(path,data):
    path.write_text(json.dumps(data,ensure_ascii=False,separators=(",",":"),sort_keys=False)+"\n",encoding="utf-8")

def key(s):
    s=unicodedata.normalize("NFD",str(s or "").casefold())
    s="".join(c for c in s if not unicodedata.category(c).startswith("M"))
    return s.replace("ς","σ").replace("j","i").replace("v","u").strip()

def trim(value,limit=310):
    value=" ".join(str(value or "").split())
    return value[:limit].rstrip()+"…" if len(value)>limit else value

def build_language(lang):
    entries={}
    forms={}
    documents=0
    licences=set()
    for path in sorted(GLOSS.glob("*-"+lang+".json")):
        doc=load(path)
        if doc.get("language")!=lang or not isinstance(doc.get("lemmas"),dict):
            continue
        documents+=1
        for src in doc.get("sources",[]):
            if src.get("license"): licences.add(src["license"])
        for lemma,details in doc["lemmas"].items():
            if not isinstance(details,dict): continue
            display=details.get("h",lemma) if lang=="la" else lemma
            display=trim(display,90)
            if not display: continue
            lexical=key(lemma)
            if not lexical: continue
            gloss=trim(details.get("g",""))
            if not gloss:continue
            item=entries.get(lexical)
            if item is None:
                entries[lexical]={"lemma":display,"gloss":gloss,"work":doc["workId"],
                                  "source":"Lewis & Short" if lang=="la" else "LSJ",
                                  "editorial":"Glosa breve indexada automáticamente; no artículo crítico completo"}
            else:
                if len(item["gloss"])<40 and len(gloss)>len(item["gloss"]):
                    item["gloss"]=gloss
                if item["work"]!=doc["workId"]:
                    item["multipleWorks"]=True
        for form, analyses in doc.get("forms",{}).items():
            k=key(form)
            if not k or len(k)>100 or k in forms:continue
            lemmas=[]
            for analysis in analyses if isinstance(analyses,list) else []:
                lemma=analysis[0] if isinstance(analysis,(list,tuple)) and analysis else analysis
                if isinstance(lemma,str) and key(lemma) in entries:
                    lemmas.append(key(lemma))
            if lemmas:
                forms[k]=list(dict.fromkeys(lemmas))[:6]

    if lang=="la":
        lex=load(ROOT/"data/latin-lexicon.json")
        for e in lex.get("entries",[]):
            k=key(e.get("lemma"))
            if not k:continue
            gloss=trim(" · ".join(x for x in [e.get("es"),e.get("en"),e.get("fr")] if x))
            if k not in entries:
                entries[k]={"lemma":e["lemma"],"gloss":gloss,
                            "source":"Glosario editorial latino","editorial":"Glosa orientativa; consultar Lewis & Short",
                            "work":"lexicon"}
            if e.get("verified"):entries[k]["localChecked"]=True
            for f in e.get("forms",[]):
                forms.setdefault(key(f),[k])

    entries={k:v for k,v in sorted(entries.items())}
    forms={k:v for k,v in sorted(forms.items()) if any(lemma in entries for lemma in v)}
    return {"schema":"vitruvia-integrated-dictionary-v1","language":lang,
       "method":"Glosas breves y lemas de glosarios LOCALES. El análisis de forma es orientativo, no identificación morfológica certificada.",
       "sources":["Perseus Digital Library (LSJ / Lewis & Short), CC BY-SA 4.0",
                  "CLTK MIT (latín); G. Celano CC BY-NC 4.0 (análisis griego), según la ficha de cada obra"],
       "glossaryDocuments":documents,"entries":entries,"forms":forms,
       "licenses":sorted(licences)}

def build_hebrew():
    etym=load(BASE/"etymologicum.json")
    roots=load(BASE/"hebrew-roots.json").get("roots",{})
    result={}
    for e in etym.get("entries",[]):
        for h in e.get("he",[]):
            if not isinstance(h,dict) or not h.get("w"):continue
            w=h["w"]; k=key(w)
            if not k:continue
            current=result.get(k)
            if current is None:
                r=roots.get(k)
                result[k]={
                    "lemma":w,"transliteration":h.get("tr",""),
                    "gloss":trim(h.get("g",""),260),
                    "root":r[0] if isinstance(r,list) and r else "",
                    "rootGloss":r[1] if isinstance(r,list) and len(r)>1 else "",
                    "relatedLatinGreek":e.get("lemma",""),
                    "source":"Etymologicum Vitruvianum · equivalencia editorial",
                    "editorial":"No es entrada completa de BDB/HALOT ni certificación de etimología"
                }
            elif not current["gloss"] and h.get("g"):
                current["gloss"]=trim(h["g"])
    for written,root in roots.items():
        k=key(written)
        if k not in result:
            result[k]={"lemma":written,"transliteration":"","gloss":trim(root[1]),
                       "root":root[0],"rootGloss":trim(root[1]),
                       "relatedLatinGreek":"",
                       "source":"Repertorio local de raíces hebreas",
                       "editorial":"Identificación orientativa; contrastar con BDB / léxicos críticos"}
    return {"schema":"vitruvia-integrated-dictionary-v1","language":"he",
            "method":"Equivalencias hebreas y raíces registradas en fichas editoriales locales; sin corpus hebreo continuo y sin reutilizar texto íntegro de diccionarios modernos.",
            "sources":["Etymologicum Vitruvianum (síntesis editorial); BDB como referencia bibliográfica, HALOT solo por cita, no copiado"],
            "entries":{k:v for k,v in sorted(result.items())}}

def run():
    counts={}
    for lang in ("la","grc"):
        doc=build_language(lang)
        min_count=1500 if lang=="la" else 1000
        if len(doc["entries"])<min_count:
            raise SystemExit(f"Índice {lang} demasiado pequeño: {len(doc['entries'])}")
        path=BASE/("dictionary-"+lang+".json")
        write(path,doc)
        counts[lang]=len(doc["entries"])
    doc=build_hebrew()
    if len(doc["entries"])<15:raise SystemExit("Índice hebreo demasiado pequeño")
    write(BASE/"dictionary-he.json",doc)
    counts["he"]=len(doc["entries"])
    write(BASE/"dictionary-integrity.json",{
        "schema":"vitruvia-integrated-dictionary-integrity-v1",
        "counts":counts,"scope":"Términos locales con glosas, no textos íntegros LSJ/BDB/OLD/HALOT",
        "policy":"No confundir glosas y equivalentes semánticos con etimologías o cotejos certificados"})
    print("PASS índices lexicográficos:",counts)

if __name__=="__main__":
    run()
