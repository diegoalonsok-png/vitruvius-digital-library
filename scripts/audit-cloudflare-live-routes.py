#!/usr/bin/env python3
"""Read-only production Cloudflare/Google Search Console route and metadata audit.

Checks every URL in the published sitemap; does not mutate site, GitHub or R2.
Produces exact failing URLs with HTTP status and probable .html routing problems.
"""
import concurrent.futures
import json
import re
import ssl
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse, urljoin
from xml.etree import ElementTree

ORIGIN = "https://vitruvius-digital-library.org"
HEADERS = {"User-Agent": "VitruviusIntegrityAudit/1.0 (read-only; site owner)", "Accept": "text/html,application/xml;q=0.9,*/*;q=0.2"}
TIMEOUT = 22
MAX_HTML = 160000

def request(url, limit=MAX_HTML):
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as f:
            return {"status": f.status, "final": f.url, "headers": dict(f.headers.items()),
                    "body": f.read(limit).decode("utf-8-sig", errors="replace")}
    except urllib.error.HTTPError as e:
        return {"status": e.code, "final": e.url, "headers": dict(e.headers.items()), "body": e.read(5000).decode("utf-8", errors="replace")}
    except Exception as e:
        return {"status": None, "final": url, "headers": {}, "body": "", "error": str(e)[:220]}

def meta_name(html, name):
    for tag in re.findall(r"<meta\b[^>]*>", html[:30000], flags=re.I):
        if re.search(r'\bname\s*=\s*["\']'+re.escape(name)+r'["\']',tag,flags=re.I):
            m=re.search(r'\bcontent\s*=\s*["\']([^"\']*)',tag,flags=re.I)
            if m:return m.group(1)
    return ""

def datasets(html):
    issues=[]
    for raw in re.findall(r'<script\b[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script\s*>',html,re.S|re.I):
        try: root=json.loads(raw.strip())
        except Exception:continue
        def walk(item):
            if isinstance(item,list):
                for child in item:yield from walk(child)
            elif isinstance(item,dict):
                yield item
                for k,v in item.items():
                    if k in ("@graph","mainEntity","hasPart") and isinstance(v,(dict,list)):
                        yield from walk(v)
        for item in walk(root):
            typ=item.get("@type")
            if typ=="Dataset" or isinstance(typ,list) and "Dataset" in typ:
                missing=[k for k in ("description","creator","license") if not item.get(k)]
                if missing:issues.append({"name":item.get("name",""),"missing":missing})
    return issues

def check(url):
    r=request(url)
    status=r["status"]
    out={"url":url,"status":status,"final":r["final"],"issues":[]}
    if r.get("error"):out["issues"].append("network-error");out["detail"]=r["error"]
    if status==404:out["issues"].append("404")
    elif status and status>=400:out["issues"].append("http-"+str(status))
    if status==200:
        robots=meta_name(r["body"],"robots").lower()
        xrobots=r["headers"].get("X-Robots-Tag",r["headers"].get("x-robots-tag","")).lower()
        if "noindex" in robots or "noindex" in xrobots:
            out["issues"].append("noindex")
            out["metaRobots"]=robots
            out["xRobots"]=xrobots
        d=datasets(r["body"])
        if d:out["datasetIssues"]=d
    if status==404 and not re.search(r"\.\w{1,6}$", urlparse(url).path):
        alternate=request(url+".html",limit=2048)
        out["htmlAlternateStatus"]=alternate["status"]
        if alternate["status"]==200:out["issues"].append("extensionless-route-missing")
    return out

def main():
    r=request(ORIGIN+"/sitemap.xml",limit=3000000)
    if r["status"]!=200:raise SystemExit("Cannot read live sitemap: "+str(r["status"]))
    root=ElementTree.fromstring(r["body"])
    urls=[]
    for loc in root.findall(".//{*}loc"):
        if loc.text:
            url=loc.text.strip()
            if urlparse(url).netloc!="vitruvius-digital-library.org":
                continue
            urls.append(url)
    urls=list(dict.fromkeys(urls))
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        rows=list(pool.map(check,urls))
    failures=[x for x in rows if x["issues"]]
    datasets_bad=[x for x in rows if x.get("datasetIssues")]
    report={"date":datetime.now(timezone.utc).isoformat(),"sitemapCount":len(urls),
      "http200":sum(x["status"]==200 for x in rows),
      "http404":sum(x["status"]==404 for x in rows),
      "noindex":sum("noindex" in x["issues"] for x in rows),
      "networkErrors":sum("network-error" in x["issues"] for x in rows),
      "extensionlessFailures":sum("extensionless-route-missing" in x["issues"] for x in rows),
      "datasetPagesWithMissingMetadata":len(datasets_bad),
      "problems":failures,"datasetIssues":datasets_bad}
    Path("cloudflare-public-route-audit.json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({k:v for k,v in report.items() if k not in ("problems","datasetIssues")},ensure_ascii=False,indent=2))
    for x in failures:print("FAIL",x["status"],",".join(x["issues"]),x["url"],"->",x["final"])
    for x in datasets_bad:print("DATASET",x["url"],x["datasetIssues"])
    if failures or datasets_bad:sys.exit(1)

if __name__=="__main__": main()
