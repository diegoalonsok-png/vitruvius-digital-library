#!/usr/bin/env python3
"""Auditoría R2 de objetos y manifiesto invertido: solo lectura, no publica falsos positivos.

Requiere R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY. Sin credenciales informa
no-verificado; nunca rebaja ni borra los registros del catálogo.
"""
import concurrent.futures, datetime, json, os, pathlib, sys, urllib.parse
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/"reports/bibliotheca/r2-live-integrity.json"
PUBLIC=ROOT/"data/r2/r2-object-status.json"
CAT=ROOT/"data/r2/catalogo-clasicos-r2.json"
BUCKET=os.environ.get("R2_BUCKET") or "vitruvius-bibliotheca"
ACCOUNT=os.environ.get("R2_ACCOUNT_ID") or "4e936bf2c4f185a87075ca506de93e69"
HOST="libros.vitruvius-digital-library.org"
REQUIRED="--required" in sys.argv
def save(obj):
 OUT.parent.mkdir(parents=True,exist_ok=True);PUBLIC.parent.mkdir(parents=True,exist_ok=True)
 OUT.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
 PUBLIC.write_text(json.dumps({k:obj[k] for k in ("schema","generated","status","counts","notes")},ensure_ascii=False,indent=2)+"\n",encoding="utf8")
def main():
 items=json.loads(CAT.read_text(encoding="utf8"))["items"]
 result={"schema":"vdl-r2-live-integrity-v1",
         "generated":datetime.datetime.now(datetime.timezone.utc).isoformat(),
         "status":"no_verificado","counts":{"editionsInGithubCatalogue":len(items)},
         "notes":"El listado GitHub no es inventario físico. Objetos R2 examinados con HEAD y manifiesto de índice por GET si hay credenciales.",
         "objects":[],"indexManifest":None}
 if not all(os.environ.get(k) for k in ("R2_ACCESS_KEY_ID","R2_SECRET_ACCESS_KEY")):
  result["notes"]+=" Faltan credenciales de lectura R2; no hay comprobación física.";save(result)
  if REQUIRED:raise SystemExit("Faltan credenciales R2; auditoría física obligatoria")
  return
 import boto3
 from botocore.config import Config
 client=boto3.client("s3",endpoint_url="https://"+ACCOUNT+".r2.cloudflarestorage.com",
  region_name="auto",aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
  aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
  config=Config(retries={"max_attempts":4,"mode":"standard"}))
 tasks=[]
 for e in items:
  for kind in ("pdf","texto"):
   uri=e.get(kind)
   if not uri:tasks.append((e["id"],kind,None,e.get("sha256") if kind=="pdf" else None));continue
   u=urllib.parse.urlparse(uri)
   key=u.path.lstrip("/") if u.scheme=="https" and u.hostname==HOST else None
   tasks.append((e["id"],kind,key,e.get("sha256") if kind=="pdf" else None))
 def probe(task):
  ident,kind,key,expected=task
  if not key:return {"id":ident,"kind":kind,"status":"invalid_url"}
  try:
   h=client.head_object(Bucket=BUCKET,Key=key)
   metadata=h.get("Metadata",{}).get("sha256")
   if expected and metadata and metadata.lower()!=expected.lower():
    return {"id":ident,"kind":kind,"status":"metadata_sha_mismatch","key":key,"expectedSha256":expected,"metadataSha256":metadata}
   return {"id":ident,"kind":kind,"status":"exists","key":key,"bytes":h["ContentLength"],
    "metadataSha256":metadata,"checksumLimit":"HEAD metadata no sustituye SHA-256 recalculado de los bytes completos"}
  except Exception as exc:
   code=getattr(exc,"response",{}).get("Error",{}).get("Code","unknown")
   return {"id":ident,"kind":kind,"status":"absent" if str(code) in ("404","NoSuchKey","NotFound") else "unverified_error","key":key,"errorCode":str(code)}
 with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
  result["objects"]=list(pool.map(probe,tasks))
 missing=[x for x in result["objects"] if x["status"]!="exists"]
 result["counts"].update(objectsChecked=len(tasks),objectsPresent=len(tasks)-len(missing),
                           objectsMissing=sum(x["status"]=="absent" for x in missing),
                           metadataHashMismatches=sum(x["status"]=="metadata_sha_mismatch" for x in missing),
                           objectsNotVerified=sum(x["status"] not in ("exists","absent") for x in missing))
 try:
  body=client.get_object(Bucket=BUCKET,Key="clasicos/indice/fragmentos.json")["Body"].read()
  index=json.loads(body)
  ids={x["id"] for x in index.get("obras",[]) if x.get("id")}
  catalogIds={e["id"] for e in items}
  result["indexManifest"]={
   "indexedEditionIds":len(ids),"catalogueEditionIds":len(catalogIds),
   "catalogueIdsAbsentFromInvertedIndex":sorted(catalogIds-ids),
   "indexedIdsAbsentFromGithubCatalogue":sorted(ids-catalogIds),
   "fragmentCount":len(index.get("fragmentos",[])),
   "status":"read_from_R2"}
  result["counts"].update(indexedEditionsManifest=len(ids),
      editionsNotInRemoteIndex=len(catalogIds-ids),indexEntriesWithoutCatalogue=len(ids-catalogIds))
  # Los registros sobrantes del índice son candidatos a reconciliar, no
  # incorporaciones automáticas: falta acreditar portada, edición y procedencia.
  extras={e.get("id"):e for e in index.get("obras",[]) if e.get("id") in ids-catalogIds}
  orphanProbes=[]
  for orphan_id,record in sorted(extras.items()):
   pdf_url=record.get("pdf","")
   parsed=urllib.parse.urlparse(pdf_url)
   pdf_key=parsed.path.lstrip("/") if parsed.scheme=="https" and parsed.hostname==HOST else "clasicos/pdf/"+orphan_id+".pdf"
   text_key="clasicos/texto/"+orphan_id+".json"
   checks={}
   for role,key in (("pdf",pdf_key),("ocr",text_key)):
    try:
     metadata=client.head_object(Bucket=BUCKET,Key=key)
     checks[role]={"status":"exists","bytes":metadata["ContentLength"],"key":key}
    except Exception as exc:
     code=getattr(exc,"response",{}).get("Error",{}).get("Code","unknown")
     checks[role]={"status":"absent" if str(code) in ("404","NoSuchKey","NotFound") else "unverified_error",
                   "errorCode":str(code),"key":key}
   orphanProbes.append({"id":orphan_id,"indexedTitle":record.get("obra"),
                        "indexedAuthor":record.get("autor"),"yearClaim":record.get("anio"),
                        "checks":checks,"catalogueStatus":"identity_pending_not_added"})
  result["indexManifest"]["orphanIndexEntries"]=orphanProbes
  result["counts"]["orphanIndexEntriesWithPdfAndOcr"]=sum(
    all(e["checks"][k]["status"]=="exists" for k in ("pdf","ocr")) for e in orphanProbes)

 except Exception as exc:
  result["indexManifest"]={"status":"not_verified","error":str(exc)[:300]}
  result["counts"]["indexManifestVerified"]=False
 result["status"]="verified_with_findings" if missing or result["indexManifest"].get("status")!="read_from_R2" or result["counts"].get("editionsNotInRemoteIndex") or result["counts"].get("indexEntriesWithoutCatalogue") else "verified_structurally"
 save(result)
 print(json.dumps({k:result[k] for k in ("status","counts","indexManifest")},ensure_ascii=False,indent=2))
 if any(x["status"] != "exists" for x in missing):
  raise SystemExit("Objetos R2 ausentes, con metadatos discordantes o cuya presencia no se pudo verificar")
 if REQUIRED and result["indexManifest"].get("status") != "read_from_R2":
  raise SystemExit("No se pudo verificar el manifiesto invertido de R2")
if __name__=="__main__":main()
