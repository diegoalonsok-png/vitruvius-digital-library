#!/usr/bin/env python3
"""Import human TEI translations of already archived Greek and Latin works into R2.

Never invent a translation, duplicate a (work,language), replace an original,
or count a translation as an additional ancient work. Persist source TEI,
full extracted translation, literal passage index and SHA-256 in R2.
"""
from __future__ import annotations
import argparse
from collections import Counter
from datetime import datetime, timezone
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import unicodedata
from urllib.parse import quote, urlparse
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location("vdl_expansion",ROOT/"scripts/expand-classics-r2.py")
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
NS=m.NS
XLANG=m.XLANG
HOST=m.HOST
BASE=Path("/tmp/vdl-classics-translations")
MANIFEST=ROOT/"data/r2/classics-translation-manifest.json"
ORIGINALS=ROOT/"data/r2/classics-expansion-manifest.json"
REGISTRY=ROOT/"data/classics-corpus/search-registry.json"
CATALOGUE=ROOT/"data/bibliotheca-graeca-latina-I-bce-I-ce.json"
LICENSES=re.compile(r"^https://creativecommons.org/(?:licenses/by(?:-sa)?/[1-4]\.0|publicdomain/(?:zero/1\.0|mark/1\.0))/?$")
TRANSLATION=re.compile(r"\.perseus-(?:eng|fre|fra|spa)\d+\.xml$")
WORK_CODE=re.compile(r"urn:cts:(?:greekLit|latinLit):([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)\.")

def json_request(url):
    h={"Accept":"application/vnd.github+json","User-Agent":"VitruviusAcademicCorpus/2.0"}
    if os.environ.get("GITHUB_TOKEN"):
        h["Authorization"]="Bearer "+os.environ["GITHUB_TOKEN"]
    with urlopen(Request(url,headers=h),timeout=35) as r:
        return json.load(r)

def source_files(row):
    """Use the source's exact CTS repository location, not a guessed author."""
    for origin in row.get("sources",[]):
        u=origin.get("sourceUrl","")
        match=re.fullmatch(
          r"https://raw\.githubusercontent\.com/(PerseusDL/canonical-(?:greekLit|latinLit))/master/(data/[A-Za-z0-9_-]+/[A-Za-z0-9_-]+)/[A-Za-z0-9._-]+\.xml",u)
        if not match: continue
        repo,directory=match.groups()
        code=WORK_CODE.search(origin.get("editionUrn",""))
        if not code: continue
        endpoint="https://api.github.com/repos/"+repo+"/contents/"+directory
        try: listing=json_request(endpoint)
        except Exception as exc:
            raise ValueError("No se pudo consultar el directorio TEI: "+str(exc)[:180])
        for file in sorted(listing,key=lambda x:x.get("name","")):
            name=file.get("name","")
            if file.get("type") != "file" or not TRANSLATION.search(name): continue
            if not name.startswith(code.group(1)+"."): continue
            url=file.get("download_url","")
            if url.startswith("https://raw.githubusercontent.com/"+repo+"/"):
                yield {"url":url,"filename":name,"workCode":code.group(1)}
        return

def translation_text(raw,src):
    if b"<!ENTITY" in raw: raise ValueError("Entidades XML personalizadas requieren revisión")
    root=ET.fromstring(raw)
    if m.tag(root)!="TEI": raise ValueError("No es TEI")
    header=root.find("t:teiHeader",NS)
    body=root.find(".//t:text/t:body",NS)
    if header is None or body is None: raise ValueError("Falta cabecera o texto")
    div=next((d for d in body.iter() if m.tag(d)=="div" and d.get("type")=="translation"),None)
    if div is None: raise ValueError("No está marcado como traducción humana TEI")
    lang=(div.get(XLANG) or root.find("t:text",NS).get(XLANG) or "").lower()
    lang={"eng":"en","en":"en","fre":"fr","fra":"fr","fr":"fr","spa":"es","es":"es"}.get(lang)
    if lang not in ("en","fr","es"): raise ValueError("Idioma de traducción no válido")
    urn=div.get("n") or body.get("{http://www.w3.org/XML/1998/namespace}base") or ""
    code=src["workCode"]
    if not re.fullmatch(r"urn:cts:(?:greekLit|latinLit):"+re.escape(code)+r"\.[A-Za-z0-9_-]+",urn):
        raise ValueError("URN de traducción no coincide con original")
    licences=[]
    for node in header.findall(".//t:availability/t:licence",NS):
        url=(node.get("target") or "").replace("http://","https://").rstrip("/")+"/"
        if LICENSES.fullmatch(url): licences.append(url)
    if not licences: raise ValueError("Sin licencia de reutilización explícita")
    translators=[]
    for node in header.findall(".//t:editor",NS):
        if (node.get("role") or "").lower() in ("translator","trans"):
            name=m.flat(node)
            if name and name not in translators: translators.append(name)
    if not translators: raise ValueError("No se acredita traductor humano")
    source_desc=header.find("t:fileDesc/t:sourceDesc",NS)
    if source_desc is None: raise ValueError("Sin fuente bibliográfica")
    dates=[int(y) for y in re.findall(r"(?<!\d)(?:1[5-9]\d{2}|20\d{2})(?!\d)",m.flat(source_desc))]
    if not dates or min(dates)>1930:
        raise ValueError("Edición histórica anterior a 1931 no acreditada")
    title=m.flat(header.find("t:fileDesc/t:titleStmt/t:title",NS)) or src["filename"]
    # The same TEI structural walker used for originals avoids double-counting.
    blocks=[]
    def walk(node,refs):
        if node.text and node.text.strip(): blocks.append((".".join(refs),"","raw",node.text.strip()))
        for child in node:
            name=m.tag(child)
            if name=="div":
                n=child.get("n","")
                walk(child,refs+([n] if n and not n.startswith("urn:") else []))
            elif name not in m.SKIP and name not in m.VOID:
                value=m.clean(child)
                if value: blocks.append((".".join(refs),child.get("n",""),name,value))
            if child.tail and child.tail.strip():
                blocks.append((".".join(refs),"","raw",child.tail.strip()))
    walk(div,[])
    if not blocks: raise ValueError("Traducción sin texto")
    counters=Counter()
    passages=[]
    for ref,n,kind,value in blocks:
        counters[ref]+=1
        reference=ref+("."+n if ref and n else n if n else "")
        locus=urn+":"+(reference or "text")
        if not n:
            locus+="~bloque-"+str(counters[ref])
        passages.append({"locus":locus,"text":value,"locusKind":"Referencia TEI de traducción; no alineación garantizada"})
    if len({p["locus"] for p in passages})!=len(passages):
        seen=Counter()
        for p in passages:
            seen[p["locus"]]+=1
            if seen[p["locus"]]>1: p["locus"]+="~ocurrencia-"+str(seen[p["locus"]])
    expected=re.sub(r"\s","",m.clean(div))
    actual=re.sub(r"\s","","".join(p["text"] for p in passages))
    if expected!=actual or len(actual)<12:
        raise ValueError("Cobertura TEI incompleta o demasiado breve")
    return {"language":lang,"urn":urn,"title":title,"translators":translators,"license":licences,
            "publicationYear":min(dates),"bibliography":m.flat(source_desc),"passages":passages}

def index_passages(passages,work,lang):
    """Verified literal token-to-passage index, not an embeddings index."""
    postings={}
    count=0
    for pi,p in enumerate(passages):
        tokens=re.findall(r"[^\W_]+(?:['’][^\W_]+)?",unicodedata.normalize("NFKC",p["text"]).casefold(),re.UNICODE)
        count+=len(tokens)
        for word in set(tokens):
            if len(word)<2: continue
            postings.setdefault(word,[]).append(pi)
    return {"schema":"vdl-human-translation-literal-index-v1","workId":work,"language":lang,
            "method":"Unicode NFKC + minúsculas, coincidencias literales por pasaje; sin embeddings ni alineación automática",
            "passages":len(passages),"tokens":count,"terms":postings}

def publish(row,src,s3,bucket):
    raw=m.download(src["url"])
    meta=translation_text(raw,src)
    work=row["workId"]
    # A translation is a version of the already existing Greek work, never a new work.
    xmlsha=m.digest(raw)
    sourcekey="corpus/fuentes/"+xmlsha+".xml"
    m.put_verified(s3,bucket,sourcekey,raw,"application/xml;charset=utf-8")
    doc={
        "workId":work,"language":meta["language"],"title":row["title"],
        "sourceType":"human-translation-tei","editorialStatus":"Traducción humana de edición identificada y licenciada; sin cotejo crítico independiente",
        "alignment":"Segmentación TEI propia de la traducción; NO se presupone alineación con el original",
        "source":src["url"],"sourceUrn":meta["urn"],"sourceSha256":xmlsha,
        "translation":{"title":meta["title"],"translators":meta["translators"],"publicationYear":meta["publicationYear"],
                       "bibliography":meta["bibliography"],"sourceUrl":src["url"]},
        "attribution":", ".join(meta["translators"])+"; "+meta["title"]+
            "; Perseus Digital Library / Tufts University; edición original en "+src["url"],
        "license":"; ".join(meta["license"]),
        "archivedSource":HOST+"/"+sourcekey,"passages":meta["passages"]}
    payload=m.packed(doc); sha=m.digest(payload)
    file=work+"-"+meta["language"]+"-"+sha[:16]+".json"
    m.put_verified(s3,bucket,"corpus/"+file,payload,"application/json;charset=utf-8")
    inv=index_passages(meta["passages"],work,meta["language"])
    indexraw=m.packed(inv); indexsha=m.digest(indexraw)
    indexkey="corpus/indice/traducciones/"+work+"-"+meta["language"]+"-"+indexsha[:16]+".json"
    m.put_verified(s3,bucket,indexkey,indexraw,"application/json;charset=utf-8")
    return {"workId":work,"author":row["author"],"title":row["title"],"language":meta["language"],
            "filename":file,"url":HOST+"/corpus/"+file,"sha256":sha,"passages":len(meta["passages"]),
            "sourceUrl":src["url"],"sourceUrn":meta["urn"],"sourceSha256":xmlsha,
            "sourceArchived":HOST+"/"+sourcekey,"translators":meta["translators"],
            "publicationYear":meta["publicationYear"],"license":meta["license"],
            "indexUrl":HOST+"/"+indexkey,"indexSha256":indexsha}

def acquire(limit):
    catalogue=m.read(CATALOGUE)
    known={w["id"] for w in catalogue["works"]}
    reg=m.read(REGISTRY)
    previous=m.read(MANIFEST).get("editions",[]) if MANIFEST.exists() else []
    # Uniqueness belongs to the specific translation edition, not merely
    # its work, author, title or language. Two English translations can coexist.
    published_urns={e.get("sourceUrn") for e in previous if e.get("sourceUrn")}
    for work in catalogue["works"]:
        for version in work.get("humanTranslations",[]):
            if version.get("sourceUrn"): published_urns.add(version["sourceUrn"])
        for version in work.get("localVersions",[]):
            if version.get("sourceUrn"): published_urns.add(version["sourceUrn"])
    original=m.read(ORIGINALS).get("editions",[])
    # Identical original work/source combinations are not queried repeatedly.
    options=[]
    seen_originals=set()
    for row in original:
        if row["workId"] not in known or row["language"] not in ("grc","la"): continue
        codes=[]
        for src in row.get("sources",[]):
            match=WORK_CODE.search(src.get("editionUrn",""))
            if match: codes.append(match.group(1))
        identity=(row["workId"],tuple(sorted(set(codes))))
        if identity not in seen_originals:
            options.append(row)
            seen_originals.add(identity)
    options.sort(key=lambda r:(r["workId"],r["title"]))
    report={"generated":datetime.now(timezone.utc).isoformat(),"considered":len(options),
            "published":[],"deferred":[]}
    if not options:
        m.save(BASE/"published.json",report)
        return report
    s3,bucket=m.client()
    lang_codes={"eng":"en","fre":"fr","fra":"fr","spa":"es"}
    rank={"en":0,"fr":1,"es":2}
    for row in options:
        if len(report["published"])>=limit: break
        try:
            sources=list(source_files(row))
            if not sources: raise ValueError("No hay traducción TEI descargable en Perseus")
            eligible=[]
            for src in sources:
                match=re.search(r"\.perseus-(eng|fre|fra|spa)\d+\.xml$",src["filename"])
                if not match: continue
                lang=lang_codes[match.group(1)]
                stem=src["filename"].removesuffix(".xml")
                namespace="latinLit" if row["language"]=="la" else "greekLit"
                edition_urn="urn:cts:"+namespace+":"+stem
                if edition_urn in published_urns: continue
                eligible.append((rank[lang],lang,src,edition_urn))
            eligible.sort(key=lambda x:(x[0],x[2]["filename"]))
            if not eligible: continue
            errors=[]
            obtained=0
            for _,lang,src,urn in eligible:
                if len(report["published"])>=limit: break
                if urn in published_urns: continue
                try:
                    found=publish(row,src,s3,bucket)
                    if found["language"]!=lang or found["sourceUrn"]!=urn:
                        raise ValueError("Identidad del fichero y TEI no coincide")
                    report["published"].append(found)
                    published_urns.add(found["sourceUrn"])
                    obtained+=1
                    print("VERIFIED_TRANSLATION",row["workId"],lang,urn,found["passages"],flush=True)
                except Exception as exc:
                    errors.append(src["filename"]+": "+str(exc)[:180])
            if not obtained and errors:
                raise ValueError("Sin traducción publicable: "+"; ".join(errors[:3]))
        except Exception as exc:
            report["deferred"].append({"workId":row["workId"],"reason":str(exc)[:350]})
            print("DEFERRED_TRANSLATION",row["workId"],str(exc)[:160],flush=True)
        m.save(BASE/"published.json",report)
    return report

def finalize():
    report=m.read(BASE/"published.json")
    rows=report.get("published",[])
    if not rows: return print("Sin traducciones publicadas nuevas: catálogo intacto")
    cat=m.read(CATALOGUE)
    reg=m.read(REGISTRY)
    byid={w["id"]:w for w in cat["works"]}
    entries={(e["workId"],e["language"],e["path"]):e for e in reg["entries"]}
    prior=m.read(MANIFEST) if MANIFEST.exists() else {"schema":"vdl-classics-translation-manifest-v1","editions":[]}
    mapped={(e["workId"],e["sourceUrn"]):e for e in prior.get("editions",[])}
    count_new=0
    for row in rows:
        wid,lang=row["workId"],row["language"]
        if wid not in byid: raise ValueError("Traducción sin obra original catalogada: "+wid)
        identity=(wid,row["sourceUrn"])
        old=mapped.get(identity)
        if old and (old["url"]!=row["url"] or old["sha256"]!=row["sha256"]):
            raise ValueError("No se reemplaza ni reescribe una edición traducida existente")
        key=(wid,lang,row["url"])
        if key in entries:
            if entries[key].get("sha256") and entries[key]["sha256"]!=row["sha256"]:
                raise ValueError("Archivo de edición existente con hash discordante")
            continue
        w=byid[wid]
        reader="classics-text-reader.html?work="+wid+"&lang="+lang+"&edition="+row["sha256"][:16]
        v={"language":lang,"path":row["url"],"label":"Traducción humana: "+", ".join(row["translators"]),
           "reader":reader,"sourceUrn":row["sourceUrn"],"sha256":row["sha256"]}
        w.setdefault("localVersions",[])
        if not any(x.get("path")==row["url"] for x in w["localVersions"]):
            w["localVersions"].append(v)
        files=w.setdefault("corpusFiles",{})
        # This mapping identifies the established DEFAULT; new versions are
        # catalogued separately and must not take away the previous selection.
        files.setdefault(lang,row["url"])
        w.setdefault("humanTranslations",[])
        if not any(x.get("sourceUrn")==row["sourceUrn"] for x in w["humanTranslations"]):
            w["humanTranslations"].append({"language":lang,"translators":row["translators"],
                "publicationYear":row["publicationYear"],"sourceUrn":row["sourceUrn"],
                "license":row["license"],"url":row["url"],"indexUrl":row["indexUrl"]})
        entries[key]={"workId":wid,"author":w["author"],"title":w["title"],"language":lang,
          "format":"json-passages","path":row["url"],"reader":reader,
          "sourceDescription":"Traducción humana acreditada: "+", ".join(row["translators"])+"; TEI Perseus, licencia y SHA256 verificados",
          "sourceUrn":row["sourceUrn"],"sha256":row["sha256"],"passages":row["passages"]}
        mapped.setdefault(identity,row)
        count_new+=1
    reg["entries"]=sorted(entries.values(),key=lambda r:(r["workId"],r["language"],r["path"]))
    reg["count"]=len(entries)
    reg["works"]=len({e["workId"] for e in entries.values()})
    reg["updated"]=datetime.now(timezone.utc).date().isoformat()
    m.save(CATALOGUE,cat);m.save(REGISTRY,reg)
    m.save(MANIFEST,{"schema":"vdl-classics-translation-manifest-v1",
      "generated":datetime.now(timezone.utc).isoformat(),
      "method":"Traducciones humanas TEI licenciadas y publicadas en R2 con SHA-256, índice literal por pasaje, sin alineación automática",
      "editions":list(mapped.values()),"lastDeferred":report.get("deferred",[]),
      "policy":"Una obra bibliográfica, varias versiones humanas identificadas por URN, sin eliminar ni reemplazar ninguna"})
    print(json.dumps({"newTranslations":count_new,"totalTranslationRecords":len(mapped),"registryVersions":len(entries)}))

def selftest():
    example=b"""<TEI xmlns="http://www.tei-c.org/ns/1.0"><teiHeader><fileDesc><titleStmt><title>Sample</title><editor role="translator">A. Translator</editor></titleStmt><publicationStmt><availability><licence target="https://creativecommons.org/licenses/by-sa/4.0/"/></availability></publicationStmt><sourceDesc><bibl><date>1891</date>Old edition</bibl></sourceDesc></fileDesc></teiHeader><text xml:lang="eng"><body><div type="translation" xml:lang="eng" n="urn:cts:greekLit:tlg0006.tlg001.perseus-eng2"><div n="1"><p>A sentence of translated text.</p></div></div></body></text></TEI>"""
    got=translation_text(example,{"workCode":"tlg0006.tlg001","filename":"sample.xml"})
    assert got["language"]=="en" and len(got["passages"])==1 and got["translators"]==["A. Translator"]
    assert index_passages(got["passages"],"test","en")["terms"]["translated"]==[0]
    print("Translation TEI extraction and literal indexing: OK")

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--limit",type=int,default=4)
    p.add_argument("--publish",action="store_true")
    p.add_argument("--finalize",action="store_true")
    p.add_argument("--self-test",action="store_true")
    args=p.parse_args()
    if args.self_test: selftest();return
    if args.finalize: finalize();return
    if not args.publish: raise SystemExit("Para R2 se requiere --publish; la preparación nunca se declara publicación")
    BASE.mkdir(parents=True,exist_ok=True)
    report=acquire(max(1,min(args.limit,12)))
    print(json.dumps({"considered":report["considered"],"published":len(report["published"]),
                      "deferred":len(report["deferred"])}))

if __name__=="__main__": main()
