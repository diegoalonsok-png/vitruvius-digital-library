#!/usr/bin/env python3
"""Archive eligible original TEI in R2 independently of search indexing."""
import argparse
import concurrent.futures
import importlib.util
import json
from datetime import datetime, timezone
from pathlib import Path
import xml.etree.ElementTree as ET
import re

spec = importlib.util.spec_from_file_location("expansion", Path(__file__).with_name("expand-classics-r2.py"))
exp = importlib.util.module_from_spec(spec)
spec.loader.exec_module(exp)

def validate_header(raw, candidate):
    if b"<!ENTITY" in raw:
        raise ValueError("ENTITY requires review")
    root = ET.fromstring(raw)
    if exp.tag(root) != "TEI":
        raise ValueError("Not TEI")
    header = root.find("t:teiHeader", exp.NS)
    body = root.find(".//t:text/t:body", exp.NS)
    if header is None or body is None:
        raise ValueError("Missing header/body")
    edition = next((e for e in body.iter() if exp.tag(e) == "div" and e.get("type") == "edition"), None)
    if edition is None:
        raise ValueError("Missing original edition")
    lang = edition.get(exp.XLANG) or root.find("t:text", exp.NS).get(exp.XLANG)
    lang = {"lat":"la","greek":"grc"}.get(lang,lang)
    if lang not in ("la","grc") or lang != candidate["language"]:
        raise ValueError("Language mismatch")
    urn = edition.get("n") or body.get("{http://www.w3.org/XML/1998/namespace}base")
    if not urn:
        urn = next((e.get("{http://www.w3.org/XML/1998/namespace}base") for e in edition.iter() if e.get("{http://www.w3.org/XML/1998/namespace}base")), "")
    if not re.fullmatch(r"urn:cts:(?:greekLit|latinLit):" + re.escape(candidate["id"]) + r"\.[A-Za-z0-9_-]+", urn or ""):
        raise ValueError("Edition URN mismatch")
    licenses = []
    for node in header.findall(".//t:availability/t:licence", exp.NS):
        url = node.get("target","").replace("http://","https://").rstrip("/") + "/"
        if re.fullmatch(r"https://creativecommons.org/(?:licenses/by(?:-sa)?/[1-4]\.0|publicdomain/(?:zero/1\.0|mark/1\.0))/",url):
            licenses.append(url)
    if not licenses:
        raise ValueError("License requires review")
    if not exp.flat(edition):
        raise ValueError("Empty edition")
    return urn, lang, sorted(set(licenses))

def immutable(s3, bucket, key, raw, mime):
    from botocore.exceptions import ClientError
    sha = exp.digest(raw)
    created = False
    try:
        s3.put_object(Bucket=bucket, Key=key, Body=raw, ContentType=mime,
                      IfNoneMatch="*", Metadata={"sha256":sha})
        created = True
    except ClientError as e:
        if e.response.get("ResponseMetadata",{}).get("HTTPStatusCode") != 412:
            raise
    if exp.digest(s3.get_object(Bucket=bucket,Key=key)["Body"].read()) != sha:
        raise ValueError("R2 hash mismatch: "+key)
    return created

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--workers",type=int,default=12)
    p.add_argument("--limit",type=int,default=0)
    args=p.parse_args()
    groups, info=exp.discover()
    s3,bucket=exp.client()
    # A durable receipt for each source edition lets later runs resume without
    # downloading successful files again. No index or catalogue is modified.
    def archive(group,candidate):
        url=candidate["original"]
        receipt_key="ingest/tei-receipts/"+exp.digest(url.encode())+".json"
        from botocore.exceptions import ClientError
        try:
            receipt=json.loads(s3.get_object(Bucket=bucket,Key=receipt_key)["Body"].read())
            if receipt["sourceUrl"] != url or receipt["workId"] != group["workId"]:
                raise ValueError("Receipt identity mismatch")
            raw=s3.get_object(Bucket=bucket,Key=receipt["key"])["Body"].read()
            if exp.digest(raw)!=receipt["sha256"]:
                raise ValueError("Archived source hash mismatch")
            return "reused",group["workId"]
        except ClientError as e:
            if e.response.get("Error",{}).get("Code") not in ("NoSuchKey","404","NotFound"):
                raise
        raw=exp.download(url)
        urn,lang,licenses=validate_header(raw,candidate)
        sha=exp.digest(raw)
        key="corpus/fuentes/"+sha+".xml"
        new=immutable(s3,bucket,key,raw,"application/xml")
        receipt={"workId":group["workId"],"author":group["author"],"title":group["title"],
                 "sourceUrl":url,"editionUrn":urn,"language":lang,"licenses":licenses,
                 "key":key,"sha256":sha,"bytes":len(raw),"indexStatus":"pending"}
        immutable(s3,bucket,receipt_key,exp.packed(receipt),"application/json")
        return ("archived" if new else "reused"),group["workId"]
    jobs=[(g,c) for g in groups for c in g["sources"]]
    if args.limit:
        jobs=jobs[:args.limit]
    archived=set()
    failures=0
    reused=0
    with concurrent.futures.ThreadPoolExecutor(max_workers=max(1,min(12,args.workers))) as pool:
        futures={pool.submit(archive,g,c):(g,c) for g,c in jobs}
        for f in concurrent.futures.as_completed(futures):
            g,c=futures[f]
            try:
                status,wid=f.result()
                if status=="archived": archived.add(wid)
                else: reused+=1
                print(status,wid,c["original"],flush=True)
            except Exception as e:
                failures+=1
                print("DEFERRED",g["workId"],str(e)[:300],flush=True)
    print(json.dumps({"candidates":len(jobs),"worksWithNewSource":len(archived),
                      "reusedEditions":reused,"deferred":failures,
                      "indexed":0,"time":datetime.now(timezone.utc).isoformat()}))
    if failures and not archived and not reused:
        raise SystemExit("No verified archives")
if __name__=="__main__":
    main()
