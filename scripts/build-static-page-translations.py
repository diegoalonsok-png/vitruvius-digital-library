#!/usr/bin/env python3
"""Build language dictionaries for the Spanish editorial prose of each HTML page.

No API key, third-party HTML proxy or browser translator is required at reading
time. Only human-readable Spanish interface/editorial text nodes are extracted.
Latin and Greek passages, manuscript witnesses, citations, original documents
and inline JavaScript are never rewritten or added to the translation memory.

Run with: python scripts/build-static-page-translations.py --limit 8
Requires: beautifulsoup4, argostranslate with es->en and es->fr models.
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

from bs4 import BeautifulSoup, NavigableString

ROOT=Path(__file__).resolve().parents[1]
OUTPUT=ROOT/"data/i18n-pages"
SKIP_TAGS={"script","style","noscript","template","code","pre","kbd","samp",
           "svg","math","textarea","option","cite","blockquote","dfn","abbr"}
SKIP_LANGS={"la","grc","el","he","arc"}
SKIP_CLASSES={"latin","greek","original-text","source-text","passage-text",
              "reader-transcript","manuscript-text","scholarly-text","notranslate"}
SPANISH=re.compile(r"\b(?:el|la|los|las|del|para|por|con|que|una|uno|este|esta|estos|se|su|en|son|como|también|desde|sobre|entre|donde|cuando|traducción|edición|libro|obras|lectura|biblioteca|manuscritos|consultar|buscar|texto|textos|fuentes|capítulo|versión|estudio)\b",re.I)
SPANISH_ACCENTS=re.compile("[áéíóúñ¿¡ÁÉÍÓÚÑ]")
GREEK=re.compile("[\u0370-\u03ff\u1f00-\u1fff]")
SPACE=re.compile(r"\s+")
PROTECTED_PATH_PREFIX=("corpus/",)
PRIORITIES=("index.html","bibliotheca-graeca-latina.html","vitruvia.html",
            "vitruvia-lexicon.html","classics-simple-parallel.html",
            "classics-parallel-reader.html","aparato-comparativo.html",
            "apparatus-bude.html","colacion.html","lector-bilingue.html")
MODEL_DIRECTIONS=(("es","en"),("es","fr"))

def normalized(value:str)->str:
    return SPACE.sub(" ",value).strip()

def eligible(node:NavigableString)->bool:
    if not isinstance(node,NavigableString):return False
    text=normalized(str(node))
    if len(text)<12 or len(text)>16000 or len(text.split())<3:return False
    if not SPANISH.search(text) and not SPANISH_ACCENTS.search(text):return False
    if GREEK.search(text):return False
    parent=node.parent
    while parent and getattr(parent,"name",None):
        if parent.name.lower() in SKIP_TAGS:return False
        attrs=getattr(parent,"attrs",{})
        if str(attrs.get("lang","")).split("-")[0].lower() in SKIP_LANGS:return False
        if attrs.get("translate")=="no" and parent.name not in ("html","body"):return False
        classes=set(attrs.get("class") or [])
        if classes & SKIP_CLASSES or attrs.get("data-no-ui-i18n") is not None:return False
        if any(attrs.get(x) is not None for x in ("data-original-language","data-citation")):return False
        parent=parent.parent
    return True

def texts(path:Path)->list[str]:
    html=path.read_text(encoding="utf-8")
    soup=BeautifulSoup(html,"html.parser")
    for tag in soup(["script","style","template","noscript"]):tag.decompose()
    if not soup.body:return []
    return sorted({normalized(str(node)) for node in soup.body.descendants if eligible(node)})

def pairs_install()->None:
    import argostranslate.package
    import argostranslate.translate
    installed=argostranslate.translate.get_installed_languages()
    def ready(source,target):
        a=next((x for x in installed if x.code==source),None)
        b=next((x for x in installed if x.code==target),None)
        return bool(a and b and a.get_translation(b))
    if all(ready(source,target) for source,target in MODEL_DIRECTIONS):return
    argostranslate.package.update_package_index()
    available=argostranslate.package.get_available_packages()
    for source,target in MODEL_DIRECTIONS:
        if ready(source,target):continue
        pkg=next((x for x in available if x.from_code==source and x.to_code==target),None)
        if pkg is None and source=="es" and target=="fr":
            # A two-hop package route can provide es -> en -> fr.
            pkg=next((x for x in available if x.from_code=="en" and x.to_code=="fr"),None)
        if pkg is None:raise RuntimeError(f"Missing translation model route {source}->{target}")
        argostranslate.package.install_from_path(pkg.download())
        installed=argostranslate.translate.get_installed_languages()
    if not all(ready(source,target) for source,target in MODEL_DIRECTIONS):
        raise RuntimeError("ES -> EN/FR translation routes are unavailable")

def translate(value:str,target:str)->str:
    import argostranslate.translate
    # Neural models have input-length limits. Keep longer editorial paragraphs
    # as sentence-sized chunks; preserve their reading order and punctuation.
    sentences=re.split(r"(?<=[.!?])\\s+",value)
    chunks=[]
    current=""
    for sentence in sentences:
        if len(sentence)>440:
            if current:chunks.append(current);current=""
            for i in range(0,len(sentence),440):chunks.append(sentence[i:i+440])
        elif len(current)+len(sentence)+1>440:
            if current:chunks.append(current)
            current=sentence
        else:
            current=(current+" "+sentence).strip()
    if current:chunks.append(current)
    rendered=normalized(" ".join(argostranslate.translate.translate(part,"es",target) for part in chunks))
    if not rendered or rendered==value:raise ValueError("Empty or unchanged translation")
    return rendered

def main()->int:
    parser=argparse.ArgumentParser()
    parser.add_argument("--limit",type=int,default=8)
    parser.add_argument("--skip-model-download",action="store_true")
    args=parser.parse_args()
    candidates=[]
    for path in ROOT.glob("*.html"):
        if path.name.startswith("_"):continue
        candidates.append(path)
    candidates.sort(key=lambda p:(0 if p.name in PRIORITIES else 1,PRIORITIES.index(p.name) if p.name in PRIORITIES else p.name))
    work=[]
    for path in candidates:
        source=texts(path)
        if not source:continue
        output=OUTPUT/(path.name+".json")
        existing={}
        if output.exists():
            try:existing=json.loads(output.read_text(encoding="utf-8")).get("translations",{})
            except (ValueError,OSError):pass
        missing=[t for t in source if t not in existing or any(not isinstance(existing[t],list) or len(existing[t])<2 or not v for v in existing[t])]
        if missing:work.append((path,source,output,existing,missing))
    if not args.skip_model_download:pairs_install()
    translated=0
    for path,source,output,existing,missing in work[:max(0,args.limit)]:
        print(f"Translating {path.name}: {len(missing)} source phrases",flush=True)
        for phrase in missing:
            try:
                existing[phrase]=[translate(phrase,"en"),translate(phrase,"fr")]
            except Exception as exc:
                print(f"  Could not translate a phrase in {path.name}: {exc}",flush=True)
                existing.pop(phrase,None)
        usable={phrase:existing[phrase] for phrase in source if phrase in existing and isinstance(existing[phrase],list) and len(existing[phrase])>=2 and all(existing[phrase])}
        output.parent.mkdir(parents=True,exist_ok=True)
        output.write_text(json.dumps({
            "schema":"vdl-static-page-translations-v1","source":path.name,
            "translationMethod":"Argos Translate es->en/es->fr; machine-generated, editorial review pending",
            "eligibleSourcePhrases":len(source),"translatedSourcePhrases":len(usable),
            "complete":len(usable)==len(source),"translations":usable,
        },ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
        translated+=1
    report={"eligiblePages":len(work),"processedPages":translated,"remainingPagesRequiringTranslation":max(0,len(work)-translated),
            "note":"Static HTML only. Dynamic JS-generated copy and PDF contents require separate localisation."}
    print(json.dumps(report,ensure_ascii=False))
    return 0

if __name__=="__main__":
    raise SystemExit(main())
