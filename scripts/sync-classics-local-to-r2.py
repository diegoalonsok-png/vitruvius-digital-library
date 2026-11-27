#!/usr/bin/env python3
"""Non-destructive, verifiable sync of indexed Greek/Latin corpus JSON to Cloudflare R2.

Publishes only registered, local, parsed passage texts; no PDF, OCR, or metadata-only
record is promoted into a source text. SHA256 verified by reading the R2 object
and the public endpoint. Never deletes, overwrites a conflicting key, or edits
source/corpus/registry. Safe to run repeatedly in bounded batches.
"""
import argparse
import datetime as dt
import hashlib
import json
import os
import pathlib
import re
import sys
import time
import urllib.error
import urllib.request

ROOT=pathlib.Path(__file__).resolve().parents[1]
REPORT=ROOT/"data/r2/classics-local-r2-sync.json"
PUBLIC="https://libros.vitruvius-digital-library.org/corpus/"
RX=re.compile(r"^data/classics-corpus/[a-z0-9-]+-(?:la|grc|en|es|fr|it|de|pt)\.json$")
PRIORITY={"plato-parmenides","plato-sophist","plato-theaetetus"}
UA={"User-Agent":"VitruviusDigitalLibrary/1.0 (academic-source-integrity)"}
def digest(data):return hashlib.sha256(data).hexdigest()
def public_bytes(name):
    req=urllib.request.Request(PUBLIC+name,headers=UA)
    with urllib.request.urlopen(req,timeout=90) as response:return response.read()
def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--limit",type=int,default=10)
    ap.add_argument("--max-bucket-bytes",type=int,default=10_000_000_000)
    args=ap.parse_args()
    if not 1<=args.limit<=40:raise SystemExit("limit must be between 1 and 40")
    for key in ("R2_ACCOUNT_ID","R2_ACCESS_KEY_ID","R2_SECRET_ACCESS_KEY","R2_BUCKET"):
        if not os.environ.get(key):raise SystemExit(f"Missing secret: {key}; nothing uploaded")
    import boto3
    from botocore.exceptions import ClientError
    client=boto3.client("s3",region_name="auto",
        endpoint_url=f"https://{os.environ['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com",
        aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"])
    bucket=os.environ["R2_BUCKET"]
    registry=json.loads((ROOT/"data/classics-corpus/search-registry.json").read_text(encoding="utf-8"))
    entries={}
    for e in registry["entries"]:
        path=e.get("path","")
        if e.get("format")!="json-passages" or not RX.fullmatch(path):continue
        entries[path]=(e["workId"],e["language"])
    saved={"schema":"vdl-classics-local-r2-verified-v1","source":"GitHub indexed corpus",
           "publicBase":PUBLIC,"objects":[]}
    if REPORT.exists():
        old=json.loads(REPORT.read_text(encoding="utf-8"))
        if old.get("schema")==saved["schema"]:
            saved["objects"]=old.get("objects",[])
    verified={e["key"]:e for e in saved["objects"]}
    files=sorted(entries,key=lambda path:(0 if entries[path][0] in PRIORITY else 1,path))
    changed=0;scanned=0
    failures=[]
    # Conservative budget guard; concurrent writers can change actual usage.
    used=sum(obj["Size"] for page in client.get_paginator("list_objects_v2").paginate(Bucket=bucket)
             for obj in page.get("Contents",[]))
    def checkpoint():
        saved["objects"]=sorted(verified.values(),key=lambda x:x["key"])
        saved["updated"]=dt.datetime.now(dt.timezone.utc).isoformat()
        saved["bucketBytesObserved"]=used
        saved["bucketByteLimit"]=args.max_bucket_bytes
        saved["issues"]=failures
        REPORT.parent.mkdir(parents=True,exist_ok=True)
        temp=REPORT.with_suffix(".tmp")
        temp.write_text(json.dumps(saved,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
        temp.replace(REPORT)
    for path in files:
        name=pathlib.PurePosixPath(path).name
        key="corpus/"+name
        local=ROOT/path
        if not local.is_file():
            failures.append({"path":path,"reason":"local-source-missing"});continue
        body=local.read_bytes()
        doc=json.loads(body)
        work,lang=entries[path]
        if doc.get("workId")!=work or doc.get("language")!=lang:
            failures.append({"path":path,"reason":"registry-source-mismatch"});continue
        passages=doc.get("passages")
        if not isinstance(passages,list) or not passages or not all(
           isinstance(p,dict) and p.get("text") and p.get("locus") for p in passages):
            failures.append({"path":path,"reason":"unusable-passages"});continue
        sha=digest(body)
        if verified.get(key,{}).get("sha256")==sha:continue
        if changed>=args.limit:break
        scanned+=1
        try:
            obj=client.get_object(Bucket=bucket,Key=key)
            remote=obj["Body"].read()
            if digest(remote)!=sha:
                failures.append({"path":path,"reason":"R2 collision: different bytes; preserved"});continue
            status="already-matching"
        except ClientError as ex:
            code=str(ex.response.get("Error",{}).get("Code",""))
            if code not in ("NoSuchKey","404","NotFound"):raise
            if used+len(body)>args.max_bucket_bytes:
                failures.append({"path":path,"reason":"bucket-budget-exceeded"})
                continue
            client.put_object(Bucket=bucket,Key=key,Body=body,IfNoneMatch="*",
                ContentType="application/json; charset=utf-8",
                CacheControl="public, max-age=300",
                Metadata={"sha256":sha})
            used+=len(body)
            uploaded=client.get_object(Bucket=bucket,Key=key)["Body"].read()
            if digest(uploaded)!=sha:raise SystemExit(f"R2 readback mismatch: {key}")
            status="uploaded-and-verified"
        ok=False
        for delay in (0,3,7,12):
            if delay:time.sleep(delay)
            try:
                if digest(public_bytes(name))==sha:ok=True;break
            except (urllib.error.URLError,TimeoutError):pass
        if not ok:
            failures.append({"path":path,"reason":"public-checksum-not-verified"});continue
        verified[key]={"key":key,"workId":work,"language":lang,
            "sha256":sha,"passages":len(passages),"bytes":len(body),
            "verifiedAt":dt.datetime.now(dt.timezone.utc).isoformat(),
            "status":status}
        changed+=1
        checkpoint()
        print(f"Verified {key}: {len(passages)} passages; {status}")
    checkpoint()
    print(f"Verified in this batch: {changed}; total certificates: {len(saved['objects'])}")
if __name__=="__main__":main()
