#!/usr/bin/env python3
"""Nightly, non-destructive Greek/Latin source harvesting for the Bibliotheca.

This is a STAGING workflow, not a claim of a critical edition or public release.
Authorized R2 destination (optional): r2://<bucket>/staging/classics-nightly/<id>/...
Requires boto3 and requests. Never stores credentials in repository.
"""
import collections
import datetime as dt
import hashlib
import json
import os
import re
import sys
import unicodedata
import xml.etree.ElementTree as ET
from pathlib import Path

import requests

ROOT=Path(__file__).resolve().parents[1]
SEEDS=ROOT/"data"/"classics-corpus"/"nightly-source-queue.json"
OUT=ROOT/"nightly-classics-staging"
REGISTRY=ROOT/"data"/"classics-corpus"/"search-registry.json"
HEADERS={"User-Agent":"VitruviusDigitalLibrary-Academic-Harvester/1.0 (+https://vitruvius-digital-library.org/)"}
STOP_TAGS={"teiHeader","note","fw","pb","lb","head"}
MAX_BYTES=18_000_000
def sha(data): return hashlib.sha256(data).hexdigest()
def now(): return dt.datetime.now(dt.timezone.utc).isoformat()
def tokens(text):
    return re.findall(r"[^\\W\\d_]+",unicodedata.normalize("NFC",text).lower(),flags=re.UNICODE)
def clean_text(node):
    parts=[]
    for element in node.iter():
        tag=element.tag.rsplit("}",1)[-1]
        if tag in STOP_TAGS: continue
        if element.text and element.text.strip(): parts.append(element.text.strip())
        if element.tail and element.tail.strip(): parts.append(element.tail.strip())
    return " ".join(parts)
def localname(element): return element.tag.rsplit("}",1)[-1]
def extract(xml):
    root=ET.fromstring(xml)
    bodies=[e for e in root.iter() if localname(e)=="body"]
    if not bodies: raise ValueError("Missing TEI body")
    body=bodies[0]
    text=clean_text(body)
    if len(text)<1000: raise ValueError("Insufficient readable source text")
    candidates=[e for e in body.iter() if localname(e) in ("p","l")]
    units=[]
    for i,node in enumerate(candidates,1):
        value=" ".join(" ".join(node.itertext()).split())
        if not value:continue
        if len(value)>100_000:continue
        units.append({"source_ordinal":i,"text":value})
    if not units:units=[{"source_ordinal":1,"text":text}]
    return text,units
def make_index(fulltext,entry):
    all_tokens=tokens(fulltext)
    freq=collections.Counter(all_tokens)
    # Vocabulary + keyword anchors are candidate features, NOT verified lemmas.
    keywords=entry.get("semantic_keywords",{})
    concepts={}
    for label,terms in keywords.items():
        count=sum(freq[t.lower()] for t in terms)
        if count:concepts[label]={"surface_form_hits":count,"forms":terms,"review":"heuristic_not_philologically_validated"}
    return {"schema":"vdl-staging-lexicon-v1","index_kind":"surface_forms_not_lemmatized",
            "token_count":len(all_tokens),"type_count":len(freq),
            "frequency":dict(freq.most_common(10000)),"semantic_candidates":concepts,
            "caveat":"Keyword matches are not lemmatization, disambiguation or validated semantic annotation."}
def r2_client():
    access=os.environ.get("R2_ACCESS_KEY_ID")
    secret=os.environ.get("R2_SECRET_ACCESS_KEY")
    account=os.environ.get("R2_ACCOUNT_ID")
    bucket=os.environ.get("R2_BUCKET")
    if not all((access,secret,account,bucket)):return None,None
    import boto3
    client=boto3.client("s3",region_name="auto",
        endpoint_url=f"https://{account}.r2.cloudflarestorage.com",
        aws_access_key_id=access,aws_secret_access_key=secret)
    return client,bucket
def already(client,bucket,key):
    if not client:return False
    try: client.head_object(Bucket=bucket,Key=key);return True
    except client.exceptions.ClientError as exc:
        code=exc.response.get("Error",{}).get("Code","")
        if str(code) in ("404","NotFound","NoSuchKey"):return False
        raise
def fetch(url):
    if not url.startswith("https://raw.githubusercontent.com/PerseusDL/"):
        raise ValueError("Source is not on approved Perseus raw host")
    with requests.get(url,timeout=75,headers=HEADERS,stream=True) as res:
        res.raise_for_status()
        blocks=[];size=0
        for chunk in res.iter_content(131072):
            size+=len(chunk)
            if size>MAX_BYTES: raise ValueError("Source exceeds byte limit")
            blocks.append(chunk)
    payload=b"".join(blocks)
    if b"<TEI" not in payload and b"<tei" not in payload:raise ValueError("Not a TEI document")
    return payload
def main():
    OUT.mkdir(parents=True,exist_ok=True)
    sources=json.loads(SEEDS.read_text(encoding="utf-8"))["sources"]
    registry=json.loads(REGISTRY.read_text(encoding="utf-8"))
    present={(x["workId"],x["language"]) for x in registry.get("entries",[])}
    client,bucket=r2_client()
    # Distribute seeds across 01:00–07:00 America/Argentina/Buenos_Aires.
    localhour=int(os.environ.get("NIGHTLY_LOCAL_HOUR","1"))
    selected=[entry for pos,entry in enumerate(sources) if pos%7==(localhour-1)%7]
    records=[]
    for entry in selected:
        id=entry["id"]
        record={"id":id,"when":now(),"status":"unknown","source":entry["source"],"workId":entry["workId"],"lang":entry["language"]}
        try:
            if (entry["workId"],entry["language"]) in present:
                record["status"]="skipped_already_in_search_registry"
            else:
                prefix=f"staging/classics-nightly/{id}"
                if already(client,bucket,f"{prefix}/source.xml"):
                    record["status"]="skipped_already_in_R2_staging"
                else:
                    xml=fetch(entry["source"]);full,passages=extract(xml)
                    corpus={"schema":"vdl-classical-tei-staging-v1","status":"not_public_not_collated",
                        "workId":entry["workId"],"language":entry["language"],
                        "author":entry["author"],"title":entry["title"],
                        "source":entry["source"],"sourceUrn":entry["sourceUrn"],
                        "editorialAttribution":entry["editorialAttribution"],
                        "rights":entry["rights"],"sourceSha256":sha(xml),
                        "passageStatus":"source_order_only_not_canonical_loci",
                        "passages":passages}
                    lexical=make_index(full,entry)
                    files={"source.xml":xml,"corpus-staging.json":json.dumps(corpus,ensure_ascii=False).encode(),
                        "index-preliminary.json":json.dumps(lexical,ensure_ascii=False).encode()}
                    folder=OUT/id;folder.mkdir(parents=True,exist_ok=True)
                    for filename,data in files.items(): (folder/filename).write_bytes(data)
                    if client:
                        for filename,data in files.items():
                            client.put_object(Bucket=bucket,Key=f"{prefix}/{filename}",Body=data,
                                ContentType="application/xml" if filename.endswith(".xml") else "application/json",
                                Metadata={"source-sha256":sha(xml),"publication-status":"editorial-staging"})
                        record["status"]="uploaded_to_R2_staging_NOT_PUBLISHED"
                    else:record["status"]="local_staging_only_R2_credentials_missing"
                    record.update({"sha256":sha(xml),"source_units":len(passages),"source_characters":len(full)})
        except Exception as exc:
            record["status"]="error";record["error"]=str(exc)[:500]
        records.append(record);print(json.dumps(record,ensure_ascii=False))
    report={"schema":"vdl-classics-nightly-run-v1","created":now(),
            "hour_argentina":localhour,"r2_configured":bool(client),"runs":records,
            "publicly_published":0,"note":"No public catalog mutation; staging is not an indexed critical edition."}
    (OUT/"run-report.json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    # Fail in Actions if an attempted source failed, so error is visible.
    return 1 if any(row["status"]=="error" for row in records) else 0
if __name__=="__main__":sys.exit(main())
