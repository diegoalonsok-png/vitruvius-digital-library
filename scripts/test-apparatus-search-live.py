#!/usr/bin/env python3
"""Check that public apparatus actually includes the multilingual locus search."""
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError
import json, datetime, sys
base=["https://vitruvius-digital-library.org","https://diegoalonsok-png.github.io/vitruvius-digital-library"]
paths=["apparatus-bude.html","assets/apparatus-locus-search.js"]
results=[]
for origin in base:
 for path in paths:
  url=f"{origin}/{path}?check=20261115"
  try:
   with urlopen(Request(url,headers={"User-Agent":"Vitruvius-Locus-Search-Deployment-Check/1.0","Cache-Control":"no-cache"}),timeout=25) as r:
    data=r.read().decode("utf-8","replace")
    required=(['id="ab-search-form"','id="ab-search-results"','apparatus-locus-search.js'] if path.endswith(".html") else ['architect:"architectus"','window.VDLApparatusLocusSearch={init}'])
    missing=[t for t in required if t not in data]
    results.append(dict(origin=origin,path=path,status=r.status,ok=r.status==200 and not missing,missing=missing,bytes=len(data)))
  except (HTTPError,URLError,TimeoutError,OSError) as e:
   results.append(dict(origin=origin,path=path,ok=False,error=str(e)))
result=dict(schema="vdl-apparatus-search-live-v1",checked_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),results=results)
out=Path("reports/deployment/apparatus-search-live.json")
out.parent.mkdir(parents=True,exist_ok=True)
out.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
for item in results:print(("OK " if item["ok"] else "ERROR ")+item["origin"]+"/"+item["path"]+" "+str(item.get("missing",item.get("error",""))))
sys.exit(0 if all(x["ok"] for x in results) else 1)
